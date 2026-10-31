import { invoke } from '@tauri-apps/api/core';
import { createAddon, timerElapsed } from './addons.js';
import { nextLocalDateValue, timeMinutes, validDateValue } from './progress.js';

const MAX_PROGRESS_RANGES = 8;

function timeValue(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function validRanges(ranges) {
    return ranges.length >= 1 && ranges.length <= MAX_PROGRESS_RANGES && ranges.every((range, index) => {
        const start = timeMinutes(range.start);
        const end = timeMinutes(range.end);
        const previousEnd = index ? timeMinutes(ranges[index - 1].end) : 0;
        return start !== null && end !== null && start < end && (index === 0 || start >= previousEnd);
    });
}

export const addonMethods = {
    hasAddon(kind) { return (this.settings.addons || []).some((addon) => addon.kind === kind); },

    addAddon(kind) {
        if (!['region_clock', 'progress'].includes(kind) && this.hasAddon(kind)) return;
        if (this.settings.addons.length >= 16) return;
        this.settings.addons.push(createAddon(kind));
        this.save();
    },

    removeAddon(id) {
        this.settings.addons = this.settings.addons.filter((addon) => addon.id !== id);
        this.save();
    },

    moveAddon(id, direction) {
        const index = this.settings.addons.findIndex((addon) => addon.id === id);
        if (index < 0) return;
        const placement = this.settings.addons[index].placement;
        let other = index + direction;
        while (other >= 0 && other < this.settings.addons.length && this.settings.addons[other].placement !== placement) other += direction;
        if (other < 0 || other >= this.settings.addons.length) return;
        [this.settings.addons[index], this.settings.addons[other]] = [this.settings.addons[other], this.settings.addons[index]];
        this.save();
    },

    progressSubtitle(addon) {
        if (addon.options.mode === 'date') return `${addon.options.start_date} → ${addon.options.end_date}`;
        if (addon.options.mode === 'countdown') {
            return this.t('addons.progressCountdownSubtitle', { minutes: Math.round((addon.options.countdown_seconds ?? 300) / 60) });
        }
        return this.t('addons.progressRangeCount', { count: addon.options.ranges.length });
    },

    progressCountdownDurationLocked(id) {
        const session = this.progressTimerSessions[id];
        return session?.has_started === true && session.finished !== true;
    },

    setProgressMode(id, mode) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !['date', 'time', 'countdown'].includes(mode)) return;
        if (mode === 'countdown' && !addon.options.countdown_seconds) addon.options.countdown_seconds = 300;
        addon.options.mode = mode;
        this.save();
    },

    updateProgressCountdownDuration(id, minutes) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || this.progressCountdownDurationLocked(id) || !Number.isInteger(minutes) || minutes < 1 || minutes > 5999) return;
        const seconds = minutes * 60;
        if (addon.options.countdown_seconds === seconds) return;
        addon.options.countdown_seconds = seconds;
        this.progressTimerSessions = {
            ...this.progressTimerSessions,
            [id]: { running: false, elapsed_ms: 0, started_at_ms: null, finished: false, has_started: false },
        };
        this.save();
    },

    async runProgressTimerAction(id, action) {
        if (!await this.saveController.flush()) return;
        invoke('progress_timer_action', { id, action }).then((session) => {
            this.progressTimerSessions = { ...this.progressTimerSessions, [id]: session };
            this.error = '';
            this.updatePreview();
        }).catch((error) => { this.error = this.t('error.progressTimer', { error }); });
    },

    updateProgressAppearance(id, field, value) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon) return;
        const valid = field === 'show_percentage' ? typeof value === 'boolean'
            : field === 'bar_length_percent' ? Number.isInteger(value) && value >= 50 && value <= 150
                : field === 'bar_thickness_percent' && Number.isInteger(value) && value >= 50 && value <= 200;
        if (!valid) return;
        addon.options[field] = value;
        this.save();
    },

    updateProgressDate(id, field, value) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !['start_date', 'end_date'].includes(field) || !validDateValue(value)) {
            this.error = this.t('addons.invalidProgressDate');
            return;
        }
        if (field === 'end_date' && value <= addon.options.start_date) {
            this.error = this.t('addons.invalidProgressDate');
            return;
        }
        addon.options[field] = value;
        if (field === 'start_date' && addon.options.end_date <= value) {
            const [year, month, day] = value.split('-').map(Number);
            addon.options.end_date = nextLocalDateValue(new Date(year, month - 1, day));
        }
        this.error = '';
        this.save();
    },

    canAddProgressRange(addon) {
        const ranges = addon.options.ranges;
        return ranges.length < MAX_PROGRESS_RANGES && timeMinutes(ranges.at(-1).end) <= 1379;
    },

    addProgressRange(id) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !this.canAddProgressRange(addon)) return;
        const start = timeMinutes(addon.options.ranges.at(-1).end);
        addon.options.ranges.push({ start: timeValue(start), end: timeValue(start + 60) });
        this.save();
    },

    removeProgressRange(id, index) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || addon.options.ranges.length <= 1) return;
        addon.options.ranges.splice(index, 1);
        this.save();
    },

    updateProgressRange(id, index, field, value) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !['start', 'end'].includes(field) || !addon.options.ranges[index]) return;
        const ranges = addon.options.ranges.map((range) => ({ ...range }));
        ranges[index][field] = value;
        if (!validRanges(ranges)) {
            this.error = this.t('addons.invalidProgressRange');
            return;
        }
        addon.options.ranges = ranges;
        this.error = '';
        this.save();
    },

    timerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer || this.timerSession?.running || timer.options[field] === value) return;
        const elapsed = timerElapsed(this.timerSession, Date.now());
        if (elapsed > 0 && !this.settings.timer_reset_warning_dismissed) {
            this.pendingTimerChange = { field, value };
            this.suppressResetPrompt = false;
            return;
        }
        this.applyTimerChange(field, value);
    },

    applyTimerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer) return;
        timer.options[field] = value;
        this.timerSession = { running: false, elapsed_ms: 0, started_at_ms: null, finished: false };
        this.save();
    },

    confirmTimerChange() {
        if (!this.pendingTimerChange) return;
        if (this.timerSession?.running) {
            this.error = this.t('addons.pauseBeforeChange');
            this.pendingTimerChange = null;
            return;
        }
        if (this.suppressResetPrompt) this.settings.timer_reset_warning_dismissed = true;
        this.applyTimerChange(this.pendingTimerChange.field, this.pendingTimerChange.value);
        this.pendingTimerChange = null;
    },

    cancelTimerChange() { this.pendingTimerChange = null; },

    async runTimerAction(action) {
        if (!await this.saveController.flush()) return;
        invoke('timer_action', { action }).then((session) => {
            this.timerSession = session;
            this.error = '';
            this.updatePreview();
        }).catch((error) => { this.error = this.t('error.timer', { error }); });
    },

};

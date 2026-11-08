import { PROGRESS_WEEKDAYS, timeMinutes, validDateValue } from './progress-display.js';
import { weekdayText } from '../../i18n.js';

import { localDateValue, nextLocalDateValue, progressDisplay } from './progress-display.js';

export const progressAddon = {
    kind: 'progress', label: 'Progress', labelKey: 'addons.progress',
    description: 'Track a date, daily time ranges, or a countdown.', maxInstances: 16,
    viewKey: 'shared', settingsViewKey: 'progress',
    createOptions({ now = new Date() } = {}) {
        return {
            mode: 'date', start_date: localDateValue(now), end_date: nextLocalDateValue(now),
            ranges: [{ start: '09:00', end: '17:00' }], auto_hide: false,
            show_percentage: false, bar_length_percent: 85, bar_thickness_percent: 100,
            countdown_seconds: 300,
        };
    },
    describe(addon, { t, settings }) {
        const options = addon.options;
        let subtitle;
        if (options.mode === 'date') subtitle = `${options.start_date} → ${options.end_date}`;
        else if (options.mode === 'countdown') subtitle = t('addons.progressCountdownSubtitle', { minutes: Math.round((options.countdown_seconds ?? 300) / 60) });
        else subtitle = t('addons.progressRangeCount', { count: options.ranges.length });
        const count = settings?.addons?.filter((item) => item.kind === 'progress')
            .findIndex((item) => item.id === addon.id) + 1;
        return { name: count > 0 ? t('addons.progressInstance', { count }) : t('addons.progress'), subtitle };
    },
    display(addon, { now, progressSessions }) {
        const progress = progressDisplay(addon.options, now, progressSessions[addon.id]);
        return { progress, hidden: progress.hidden };
    },
    actions(addon, state) {
        if (addon.options.mode !== 'countdown') return [];
        const session = state.progressTimerSessions?.[addon.id];
        return [
            { id: 'toggle', labelKey: session?.running ? 'addons.pause' : 'addons.start', roles: ['primary-click', 'settings-button'], primary: true, enabled: addon.enabled },
            { id: 'reset', labelKey: 'addons.reset', roles: ['settings-button'], primary: false, enabled: addon.enabled },
        ];
    },
};

const MAX_PROGRESS_RANGES = 8;
function timeValue(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function validRanges(ranges) {
    return ranges.length >= 1 && ranges.length <= MAX_PROGRESS_RANGES && ranges.every((range, index) => {
        const start = timeMinutes(range.start);
        const end = timeMinutes(range.end);
        if (start === null || end === null || start >= end || (index && start < timeMinutes(ranges[index - 1].start))) return false;
        return ranges.slice(0, index).every((previous) => {
            if (start >= timeMinutes(previous.end)) return true;
            return PROGRESS_WEEKDAYS.every((day) => !rangeRunsOnDay(range, day) || !rangeRunsOnDay(previous, day));
        });
    });
}

function rangeRunsOnDay(range, day) {
    return !range.days?.length || range.days.includes(day);
}

function availableProgressRange(ranges) {
    // Prefer a daytime hour, then an earlier hour, on each day where it is free.
    const starts = [...Array.from({ length: 15 }, (_, hour) => (hour + 9) * 60),
        ...Array.from({ length: 9 }, (_, hour) => hour * 60)];
    for (const start of starts) {
        const end = start + 60;
        if (end > 1439) continue;
        const days = PROGRESS_WEEKDAYS.filter((day) => ranges.every((range) =>
            !rangeRunsOnDay(range, day) || end <= timeMinutes(range.start) || start >= timeMinutes(range.end)));
        if (days.length) {
            return { start: timeValue(start), end: timeValue(end), ...(days.length === 7 ? {} : { days }) };
        }
    }
    return null;
}

export const progressEditorMethods = {
    progressWeekdays() { return [...PROGRESS_WEEKDAYS.slice(1), PROGRESS_WEEKDAYS[0]]; },
    progressWeekdayLabel(day) {
        return weekdayText(new Date(2023, 0, 1 + PROGRESS_WEEKDAYS.indexOf(day)), this.language);
    },
    progressWeekdaySelected(range, day) { return rangeRunsOnDay(range, day); },
    setProgressWeekday(id, index, day) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        const range = addon?.options.ranges[index];
        if (!range || (day !== null && !PROGRESS_WEEKDAYS.includes(day))) return;
        const next = { ...range };
        if (day === null) {
            delete next.days;
        } else {
            const selected = new Set(range.days?.length ? range.days : PROGRESS_WEEKDAYS);
            if (selected.has(day)) selected.delete(day);
            else selected.add(day);
            if (!selected.size) return;
            if (selected.size === 7) delete next.days;
            else next.days = PROGRESS_WEEKDAYS.filter((value) => selected.has(value));
        }
        const ranges = addon.options.ranges.map((item, current) => current === index ? next : item);
        if (!validRanges(ranges)) {
            this.error = this.t('addons.invalidProgressRange');
            return;
        }
        addon.options.ranges = ranges;
        this.error = '';
        this.save();
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
        const nextSessions = {
            ...this.progressTimerSessions,
            [id]: { running: false, elapsed_ms: 0, started_at_ms: null, finished: false, has_started: false },
        };
        if (this.addonState) this.addonState.setProgress(nextSessions);
        else this.progressTimerSessions = nextSessions;
        this.save();
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
        return ranges.length < MAX_PROGRESS_RANGES && availableProgressRange(ranges) !== null;
    },

    addProgressRange(id) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !this.canAddProgressRange(addon)) return;
        const range = availableProgressRange(addon.options.ranges);
        addon.options.ranges.push(range);
        addon.options.ranges.sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
        this.save();
        return addon.options.ranges.indexOf(range);
    },

    removeProgressRange(id, index) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || addon.options.ranges.length <= 1) return;
        addon.options.ranges.splice(index, 1);
        this.save();
    },

    updateProgressRangeTimes(id, index, start, end) {
        const addon = this.settings.addons.find((item) => item.id === id && item.kind === 'progress');
        if (!addon || !addon.options.ranges[index]) return null;
        const ranges = addon.options.ranges.map((range) => ({ ...range }));
        const edited = ranges[index];
        edited.start = start;
        edited.end = end;
        ranges.sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
        if (!validRanges(ranges)) {
            this.error = this.t('addons.invalidProgressRange');
            return null;
        }
        addon.options.ranges = ranges;
        this.error = '';
        this.save();
        return ranges.indexOf(edited);
    },
};

progressAddon.editor = {
    ...progressEditorMethods,
    setOption(addon, field, value) {
        if (field !== 'auto_hide' || typeof value !== 'boolean') return false;
        addon.options.auto_hide = value;
        return true;
    },
};

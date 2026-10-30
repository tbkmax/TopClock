import { invoke } from '@tauri-apps/api/core';
import { createAddon, timerElapsed } from './addons.js';

export const addonMethods = {
    hasAddon(kind) { return (this.settings.addons || []).some((addon) => addon.kind === kind); },

    addAddon(kind) {
        if (kind !== 'region_clock' && this.hasAddon(kind)) return;
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

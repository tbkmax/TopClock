import { addPreset, removePreset, presetChoices } from './countdown-presets.js';

export function timerElapsed(session, nowMs) {
    if (!session) return 0;
    return session.elapsed_ms + (session.running ? Math.max(0, nowMs - (session.started_at_ms ?? nowMs)) : 0);
}
export function timerText(addon, session, nowMs) {
    const elapsed = timerElapsed(session, nowMs);
    const remaining = addon.options.mode === 'countdown'
        ? Math.max(0, addon.options.duration_seconds * 1000 - elapsed) : elapsed;
    const totalSeconds = addon.options.mode === 'countdown'
        ? Math.ceil(remaining / 1000) : Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
export const timerAddon = {
    kind: 'timer', label: 'Timer', labelKey: 'addons.timer',
    description: 'Count down or use a stopwatch.', maxInstances: 1,
    viewKey: 'shared', settingsViewKey: 'timer', detailsViewKey: 'timer-details',
    detailsInit(settingsPage) { settingsPage.presetInput = ''; },
    createOptions: () => ({ mode: 'countdown', duration_seconds: 300 }),
    describe: (_addon, { t }) => ({ name: t('addons.timer'), subtitle: t('addons.timerSubtitle') }),
    display(addon, { now, session }) {
        const nowMs = now.getTime();
        return {
            text: timerText(addon, session, nowMs),
            finished: Boolean(session?.finished) || (addon.options.mode === 'countdown'
                && session?.running && timerElapsed(session, nowMs) >= addon.options.duration_seconds * 1000),
        };
    },
    actions(addon, state) {
        return [
            { id: 'toggle', labelKey: state.timerSession?.running ? 'addons.pause' : 'addons.start', roles: ['primary-click', 'settings-button', 'clock-menu'], primary: true, enabled: addon.enabled },
            { id: 'reset', labelKey: 'addons.reset', shortcutKey: 'timer_reset', roles: ['settings-button', 'clock-menu'], primary: false, enabled: addon.enabled },
        ];
    },
    menu: {
        grouped: true,
        sections(_addon, { settings, state, nowMs }) {
            const session = state.timerSession;
            const elapsed = timerElapsed(session, nowMs);
            const mode = settings.addons.find((item) => item.kind === 'timer')?.options.mode;
            return [
                { id: 'mode', labelKey: 'addons.mode', choices: ['countdown', 'stopwatch'].map((value) => ({
                    id: `mode-${value}`, value, selected: value === mode, labelKey: `addons.${value}`,
                    confirm: {
                        required: value !== mode && (session?.running || elapsed > 0) && !settings.timer_reset_warning_dismissed,
                        titleKey: 'addons.timerModeResetTitle', bodyKey: 'addons.timerModeResetWarning',
                        acceptKey: 'addons.resetAndChange', allowDismiss: true,
                    },
                })) },
                ...(mode === 'countdown' ? [{ id: 'set', labelKey: 'addons.setPreset', choices: presetChoices(
                    settings.timer_countdown_presets, session, settings.timer_preset_warning_dismissed, nowMs,
                    { titleKey: 'addons.presetResetTitle', bodyKey: 'addons.timerPresetResetWarning', acceptKey: 'addons.resetAndStart' },
                ) }] : []),
            ];
        },
    },
};

export const timerEditorMethods = {
    timerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer || timer.options[field] === value) return;
        if (field === 'mode' && timer.enabled) {
            const elapsed = timerElapsed(this.timerSession, Date.now());
            if ((this.timerSession?.running || elapsed > 0) && !this.settings.timer_reset_warning_dismissed) {
                this.pendingTimerChange = { field, value };
                this.suppressResetPrompt = false;
                return;
            }
            this.applyTimerMode(value, false);
            return;
        }
        if (timer.enabled && this.timerSession?.running) return;
        const elapsed = timerElapsed(this.timerSession, Date.now());
        if (timer.enabled && elapsed > 0 && !this.settings.timer_reset_warning_dismissed) {
            this.pendingTimerChange = { field, value };
            this.suppressResetPrompt = false;
            return;
        }
        this.applyTimerChange(field, value);
    },

    async applyTimerMode(mode, confirmedReset) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer) return;
        try {
            const result = await this.addonHost.dispatchMenuChoice(timer.id, `mode-${mode}`, {
                confirmedReset, dontShowAgain: confirmedReset && this.suppressResetPrompt,
            });
            if (!result) return;
            this.error = '';
            this.pendingTimerChange = null;
        } catch (error) {
            this.error = this.t('error.timer', { error });
        }
    },

    applyTimerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer) return;
        timer.options[field] = value;
        const session = { running: false, elapsed_ms: 0, started_at_ms: null, finished: false };
        this.addonHost.setTimer(session);
        this.save();
    },

    confirmTimerChange() {
        if (!this.pendingTimerChange) return;
        if (this.pendingTimerChange.field === 'mode') {
            this.applyTimerMode(this.pendingTimerChange.value, true);
            return;
        }
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

    addTimerPreset() {
        if (!addPreset(this.settings, 'timer_countdown_presets', this.presetInput)) {
            this.error = this.t('addons.invalidPreset');
            return;
        }
        this.presetInput = '';
        this.error = '';
        this.save();
    },
    removeTimerPreset(minutes) {
        removePreset(this.settings, 'timer_countdown_presets', minutes);
        this.save();
    },
    setTimerPresetWarning(enabled) {
        this.settings.timer_preset_warning_dismissed = !enabled;
        this.save();
    },
    setTimerModeWarning(enabled) {
        this.settings.timer_reset_warning_dismissed = !enabled;
        this.save();
    },

};

timerAddon.editor = timerEditorMethods;

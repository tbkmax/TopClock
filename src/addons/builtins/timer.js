
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
    viewKey: 'shared', settingsViewKey: 'timer',
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
            { id: 'toggle', labelKey: state.timerSession?.running ? 'addons.pause' : 'addons.start', roles: ['primary-click', 'settings-button'], primary: true, enabled: addon.enabled },
            { id: 'reset', labelKey: 'addons.reset', menuLabelKey: 'app.resetTimer', shortcutKey: 'timer_reset', roles: ['settings-button', 'clock-menu'], primary: false, enabled: addon.enabled },
        ];
    },
};

export const timerEditorMethods = {
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
        const session = { running: false, elapsed_ms: 0, started_at_ms: null, finished: false };
        this.addonHost.setTimer(session);
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

};

timerAddon.editor = timerEditorMethods;

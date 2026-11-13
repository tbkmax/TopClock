export function counterValue(session, nowMs) {
    if (!session) return 0;
    const elapsed = session.running ? Math.max(0, nowMs - (session.started_at_ms ?? nowMs)) : 0;
    return session.value_ms + elapsed * (session.direction || 0);
}

export function counterDisplay(session, nowMs) {
    const value = counterValue(session, nowMs);
    const totalSeconds = Math.floor(Math.abs(value) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
    const text = hours >= 100
        ? `${Math.floor(hours / 24)}:${String(hours % 24).padStart(2, '0')}:${minutes}`
        : `${hours}:${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
    return { text, color: value < 0 ? '#ef4444' : value > 0 ? '#22c55e' : null,
        direction: value < 0 ? 'negative' : value > 0 ? 'positive' : 'zero' };
}

export const counterAddon = {
    kind: 'counter', label: 'Counter', labelKey: 'addons.counter',
    description: 'Keep a signed time balance.', maxInstances: 1,
    viewKey: 'shared', settingsViewKey: 'counter',
    createOptions: () => ({}),
    describe: (_addon, { t }) => ({ name: t('addons.counter'), subtitle: t('addons.counterSubtitle') }),
    display(_addon, { now, counterSession }) { return counterDisplay(counterSession, now.getTime()); },
    actions(addon) {
        return [
            { id: 'start_positive', labelKey: 'addons.countUp', roles: ['clock-menu', 'settings-button'], enabled: addon.enabled },
            { id: 'start_negative', labelKey: 'addons.countDown', roles: ['clock-menu', 'settings-button'], enabled: addon.enabled },
            { id: 'stop', labelKey: 'addons.stop', roles: ['clock-menu', 'settings-button'], enabled: addon.enabled },
            { id: 'reset', labelKey: 'addons.reset', roles: ['counter-reset'], enabled: addon.enabled },
        ];
    },
    menu: { grouped: true, sections: () => [] },
    editor: {},
};

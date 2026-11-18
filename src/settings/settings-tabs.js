export const SETTINGS_TABS = ['clock', 'addons', 'shortcuts', 'general'];

export function nextSettingsTab(current, key) {
    const index = SETTINGS_TABS.indexOf(current);
    if (index < 0) return null;
    if (key === 'ArrowDown' || key === 'ArrowRight') return SETTINGS_TABS[(index + 1) % SETTINGS_TABS.length];
    if (key === 'ArrowUp' || key === 'ArrowLeft') return SETTINGS_TABS[(index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length];
    if (key === 'Home') return SETTINGS_TABS[0];
    if (key === 'End') return SETTINGS_TABS.at(-1);
    return null;
}

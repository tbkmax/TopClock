// One visibility policy for the desktop clock and its add-ons. Menu and palette
// are separate windows and never use this opacity.
export function clockContentOpacity(settings, now, isNear, isModifierHeld) {
    if (isModifierHeld) return 1;
    if (settings?.show_only_on_hour
        && now.getMinutes() !== 0
        && !(settings.show_on_half_hour && now.getMinutes() === 30)) return 0;

    const baseline = 1 - (settings?.default_transparency_percent ?? 0) / 100;
    return isNear ? Math.min(baseline, 0.08) : baseline;
}

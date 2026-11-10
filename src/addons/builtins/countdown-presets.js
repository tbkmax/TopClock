export function presetChoices(minutesList, session, warningDismissed, nowMs, confirm) {
    const elapsed = (session?.elapsed_ms || 0) + (session?.running
        ? Math.max(0, nowMs - (session.started_at_ms ?? nowMs)) : 0);
    return (minutesList || []).map((minutes) => ({
        id: `preset-${minutes}`, value: minutes,
        labelKey: 'addons.presetMinutes', labelVars: { minutes },
        confirm: {
            required: (session?.running || elapsed > 0) && !warningDismissed,
            ...confirm, bodyVars: { minutes }, allowDismiss: true,
        },
    }));
}

export function addPreset(settings, field, value) {
    const minutes = Number(value);
    const presets = settings[field];
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 5999
        || presets.includes(minutes) || presets.length >= 8) return false;
    settings[field] = [...presets, minutes].sort((a, b) => a - b);
    return true;
}

export function removePreset(settings, field, minutes) {
    settings[field] = settings[field].filter((value) => value !== minutes);
}

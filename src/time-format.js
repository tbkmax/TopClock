export const timeLayouts = [
    { value: 'hms', label: 'H:M:S' },
    { value: 'hm', label: 'H:M' },
    { value: 'ms', label: 'M:S' },
    { value: 'h', label: 'H' },
    { value: 'm', label: 'M' },
    { value: 's', label: 'S' },
];

export function timeParts(date, settings) {
    const layout = settings.time_layout || 'hms';
    const hour = date.getHours();
    const values = {
        h: String(settings.twenty_four_hour ? hour : hour % 12 || 12),
        m: String(date.getMinutes()).padStart(2, '0'),
        s: String(date.getSeconds()).padStart(2, '0'),
    };
    const parts = [];
    for (const unit of layout) {
        if (parts.length) parts.push({ kind: 'separator', text: ':' });
        parts.push({ kind: unit, text: values[unit] });
    }
    if (layout.includes('h') && !settings.twenty_four_hour && settings.show_ampm) {
        parts.push({ kind: 'ampm', text: hour >= 12 ? 'PM' : 'AM' });
    }
    return parts;
}

export function clockFontStack(family) {
    const valid = typeof family === 'string' && family.length > 0 && family.length <= 80
        && !/[\u0000-\u001f\u007f]/u.test(family);
    const safeFamily = (valid ? family : 'Segoe UI').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    return `"${safeFamily}", "Segoe UI", Arial, sans-serif`;
}

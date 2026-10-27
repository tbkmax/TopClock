export const timeLayouts = [
    { value: 'hms', label: 'H:M:S' },
    { value: 'hm', label: 'H:M' },
    { value: 'ms', label: 'M:S' },
    { value: 'h', label: 'H' },
    { value: 'm', label: 'M' },
    { value: 's', label: 'S' },
];

const zoneFormatters = new Map();

function formatterForZone(timeZone) {
    let formatter = zoneFormatters.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        });
        zoneFormatters.set(timeZone, formatter);
    }
    return formatter;
}

export function timeParts(date, settings, timeZone = null) {
    const layout = settings.time_layout || 'hms';
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    if (timeZone) {
        const fields = Object.fromEntries(formatterForZone(timeZone)
            .formatToParts(date).map(({ type, value }) => [type, value]));
        hour = Number(fields.hour) % 24;
        minute = Number(fields.minute);
        second = Number(fields.second);
    }
    const values = {
        h: String(settings.twenty_four_hour ? hour : hour % 12 || 12),
        m: String(minute).padStart(2, '0'),
        s: String(second).padStart(2, '0'),
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

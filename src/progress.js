const DAY_MS = 86_400_000;

export function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function nextLocalDateValue(date) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return localDateValue(next);
}

export function validDateValue(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function timeMinutes(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
    const hours = Number(value.slice(0, 2));
    const minutes = Number(value.slice(3));
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function progressPhase(percent) {
    if (percent >= 100) return 'complete';
    if (percent >= 66) return 'late';
    if (percent >= 33) return 'middle';
    return 'early';
}

export function progressBarStyle(addon, clockFontSize) {
    const fontSize = clockFontSize * addon.size_percent / 100;
    const length = Math.max(110, Math.min(12 * fontSize, 320)) * (addon.options.bar_length_percent ?? 85) / 100;
    const thickness = Math.max(4, Math.min(.45 * fontSize, 10)) * (addon.options.bar_thickness_percent ?? 100) / 100;
    return { '--progress-length': `${length}px`, '--progress-thickness': `${thickness}px` };
}

export function markCountdownCompletion(display, addon, previous, activeUntil, nowMs) {
    if (addon.kind !== 'progress' || addon.options.mode !== 'countdown') return;
    const percent = display.progress.rows[0].percent;
    if (previous[addon.id] < 100 && percent >= 100) activeUntil[addon.id] = nowMs + 1500;
    display.progress.rows[0].celebrating = nowMs < (activeUntil[addon.id] ?? 0);
    previous[addon.id] = percent;
}

function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
}

function row(label, percent, nowMs = 0, finishedAtMs = 0) {
    const value = clampPercent(percent);
    return {
        label,
        percent: value,
        percentText: `${Math.round(value)}%`,
        phase: progressPhase(value),
        celebrating: finishedAtMs > 0 && nowMs >= finishedAtMs && nowMs < finishedAtMs + 1500,
    };
}

export function progressDisplay(options, now, session = null) {
    if (options.mode === 'countdown') {
        const durationMs = (options.countdown_seconds ?? 300) * 1000;
        const elapsedMs = (session?.elapsed_ms ?? 0) + (session?.running
            ? Math.max(0, now.getTime() - (session.started_at_ms ?? now.getTime())) : 0);
        return { rows: [row('Countdown', 100 * elapsedMs / durationMs)], hidden: false };
    }
    if (options.mode === 'date') {
        const day = localDateValue(now);
        const ordinal = (value) => {
            const [year, month, date] = value.split('-').map(Number);
            return Date.UTC(year, month - 1, date) / DAY_MS;
        };
        const percent = 100 * (ordinal(day) - ordinal(options.start_date))
            / (ordinal(options.end_date) - ordinal(options.start_date));
        return { rows: [row(`${options.start_date} → ${options.end_date}`, percent)], hidden: false };
    }

    const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000;
    const nowMs = now.getTime();
    const boundary = (minutes) => new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        Math.floor(minutes / 60), minutes % 60,
    ).getTime();
    const rows = options.ranges.map((range) => {
        const start = timeMinutes(range.start);
        const end = timeMinutes(range.end);
        const percent = 100 * (minute - start) / (end - start);
        return row(`${range.start}–${range.end}`, percent, nowMs, boundary(end));
    });
    const finalEnd = timeMinutes(options.ranges.at(-1).end);
    const hidden = options.auto_hide === true && nowMs >= boundary(finalEnd) + 60_000;
    return { rows, hidden };
}

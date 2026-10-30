import { timeParts } from './time-format.js';
import { translate, weekdayText } from './i18n.js';
import { localDateValue, nextLocalDateValue, progressDisplay } from './progress.js';

export const addonCatalog = [
    { kind: 'date', label: 'Date', description: 'Show the local calendar date.', options: { format: 'ymd', show_weekday: false } },
    { kind: 'region_clock', label: 'Region clock', description: 'Show time in another region.', options: { time_zone: 'Etc/UTC', show_label: true } },
    { kind: 'timer', label: 'Timer', description: 'Count down or use a stopwatch.', options: { mode: 'countdown', duration_seconds: 300 } },
    { kind: 'progress', label: 'Progress', description: 'Track a date or daily time ranges.', options: { mode: 'date', start_date: '', end_date: '', ranges: [{ start: '09:00', end: '17:00' }], auto_hide: false } },
];

export function createAddon(kind) {
    const entry = addonCatalog.find((item) => item.kind === kind);
    if (!entry) throw new Error('Unknown add-on type');
    const options = structuredClone(entry.options);
    if (kind === 'progress') {
        const today = new Date();
        options.start_date = localDateValue(today);
        options.end_date = nextLocalDateValue(today);
    }
    return {
        id: crypto.randomUUID(),
        kind,
        enabled: true,
        placement: 'below',
        size_percent: 30,
        options,
    };
}

export function addonName(addon) {
    if (addon.kind === 'region_clock') {
        const zone = addon.options.time_zone;
        return zone === 'Etc/UTC' ? 'UTC' : zone.split('/').at(-1).replaceAll('_', ' ');
    }
    return addonCatalog.find((item) => item.kind === addon.kind)?.label || addon.kind;
}

export function availableTimeZones() {
    try {
        return ['Etc/UTC', ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'Etc/UTC')];
    } catch {
        return ['Etc/UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
    }
}

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
    const display = hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return display;
}

export function displayAddon(addon, now, settings, session, language = 'en') {
    const base = { ...addon, label: addon.kind === 'region_clock' ? addonName(addon) : translate(language, `addons.${addon.kind}`), text: '', weekday: '', parts: null, finished: false, hidden: false, progress: null };
    if (addon.kind === 'date') {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        base.text = addon.options.format === 'd' ? day
            : addon.options.format === 'md' ? `${month}-${day}` : `${year}-${month}-${day}`;
        if (addon.options.show_weekday === true) {
            base.weekday = weekdayText(now, language);
        }
    } else if (addon.kind === 'region_clock') {
        try {
            base.parts = timeParts(now, settings, addon.options.time_zone);
        } catch {
            base.text = translate(language, 'addons.invalidRegion');
        }
    } else if (addon.kind === 'timer') {
        base.text = timerText(addon, session, now.getTime());
        base.finished = Boolean(session?.finished) || (addon.options.mode === 'countdown' && session?.running && timerElapsed(session, now.getTime()) >= addon.options.duration_seconds * 1000);
    } else if (addon.kind === 'progress') {
        base.progress = progressDisplay(addon.options, now);
        base.hidden = base.progress.hidden;
    }
    return base;
}

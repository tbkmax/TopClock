import { translate } from '../i18n.js';
import { addonCatalog, getAddonDefinition } from './registry.js';
import { regionName, availableTimeZones } from './builtins/region-clock.js';
import { timerElapsed, timerText } from './builtins/timer.js';

export { addonCatalog, availableTimeZones, timerElapsed, timerText };

export function createAddon(kind, now = new Date()) {
    const definition = getAddonDefinition(kind);
    if (!definition) throw new Error('Unknown add-on type');
    return {
        id: crypto.randomUUID(), kind, enabled: true, placement: 'below', size_percent: 30,
        options: definition.createOptions({ now }),
    };
}

export function addonName(addon) {
    return addon.kind === 'region_clock' ? regionName(addon) : getAddonDefinition(addon.kind)?.label || addon.kind;
}

export function displayAddon(addon, now, settings, session, language = 'en', progressSessions = {}) {
    const definition = getAddonDefinition(addon.kind);
    const base = {
        ...addon, label: addon.kind === 'region_clock' ? regionName(addon) : translate(language, `addons.${addon.kind}`),
        viewKey: definition?.viewKey, showLabel: false,
        text: '', weekday: '', parts: null, finished: false, hidden: false, progress: null,
    };
    return definition ? {
        ...base, ...definition.display(addon, { now, settings, session, language, progressSessions }),
    } : base;
}

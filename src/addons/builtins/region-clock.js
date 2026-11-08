import { timeParts } from '../../time-format.js';
import { translate } from '../../i18n.js';

export function regionName(addon) {
    const zone = addon.options.time_zone;
    return zone === 'Etc/UTC' ? 'UTC' : zone.split('/').at(-1).replaceAll('_', ' ');
}
export function availableTimeZones() {
    try {
        return ['Etc/UTC', ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'Etc/UTC')];
    } catch {
        return ['Etc/UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
    }
}
export const regionClockAddon = {
    kind: 'region_clock', label: 'Region clock', labelKey: 'addons.region_clock',
    description: 'Show time in another region.', maxInstances: 12,
    viewKey: 'shared', settingsViewKey: 'region-clock',
    createOptions: () => ({ time_zone: 'Etc/UTC', show_label: true }),
    describe: (addon) => ({ name: regionName(addon), subtitle: addon.options.time_zone }),
    display(addon, { now, settings, language }) {
        try { return { parts: timeParts(now, settings, addon.options.time_zone), showLabel: addon.options.show_label !== false }; }
        catch { return { text: translate(language, 'addons.invalidRegion'), showLabel: addon.options.show_label !== false }; }
    },
    actions: () => [],
    editor: {
        setOption(addon, field, value) {
            if (field === 'time_zone' && typeof value === 'string') addon.options.time_zone = value;
            else if (field === 'show_label' && typeof value === 'boolean') addon.options.show_label = value;
            else return false;
            return true;
        },
    },
};

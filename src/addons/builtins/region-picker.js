import { zoneCountryCodes } from './zone-country-codes.js';

function searchText(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('_', ' ').toLowerCase();
}

function regionNames(language) {
    try { return new Intl.DisplayNames(language, { type: 'region' }); }
    catch { return { of: (code) => code }; }
}

export function createTimeZoneOptions(zones, language = 'en') {
    const localizedNames = regionNames(language);
    const englishNames = regionNames('en');
    return zones.map((id) => {
        const city = id === 'Etc/UTC' ? 'UTC' : id.split('/').at(-1).replaceAll('_', ' ');
        const countries = (zoneCountryCodes[id] || []).map((code) => ({
            code, localized: localizedNames.of(code), english: englishNames.of(code),
        }));
        return {
            id, city, countries,
            terms: [id.replaceAll('_', ' '), city, ...countries.flatMap(({ code, localized, english }) => [code, localized, english])].map(searchText),
        };
    });
}

export function filterTimeZones(options, query) {
    const needle = searchText(query).trim();
    if (!needle) return options;
    const words = needle.split(/\s+/);
    const rank = (option) => {
        const city = searchText(option.city);
        const countries = option.countries.flatMap(({ code, localized, english }) => [code.toLowerCase(), searchText(localized), searchText(english)]);
        if (countries.some((name) => name === needle)) return 0;
        if (city.startsWith(needle)) return 1;
        if (countries.some((name) => name.startsWith(needle))) return 2;
        if (city.includes(needle)) return 3;
        if (countries.some((name) => name.includes(needle))) return 4;
        return 5;
    };
    return options.filter((option) => words.every((word) => option.terms.some((term) => term.includes(word))))
        .sort((left, right) => rank(left) - rank(right));
}

function zoneLabel(zone, options) {
    const option = options.find(({ id }) => id === zone);
    return option ? [option.city, option.countries[0]?.localized].filter(Boolean).join(', ') : zone.replaceAll('_', ' ');
}

export function regionZonePicker(addon, options) {
    return {
        addon,
        options,
        query: zoneLabel(addon.options.time_zone || 'Etc/UTC', options),
        open: false,
        activeIndex: 0,
        get matches() { return filterTimeZones(this.options, this.query); },
        selectedLabel() { return zoneLabel(this.addon.options.time_zone || 'Etc/UTC', this.options); },
        countryFor(option) {
            const needle = searchText(this.query).trim();
            const matched = option.countries.find(({ code, localized, english }) => needle &&
                [code, localized, english].some((name) => searchText(name).includes(needle)));
            return (matched || option.countries[0])?.localized || '';
        },
        optionLabel(option) { return [option.city, this.countryFor(option)].filter(Boolean).join(', '); },
        openPicker() {
            if (this.open) return;
            this.open = true;
            this.query = '';
            this.activeIndex = 0;
        },
        closePicker() {
            this.open = false;
            this.query = this.selectedLabel();
            this.activeIndex = 0;
        },
        choose(zone) {
            this.open = false;
            this.query = zoneLabel(zone, this.options);
            this.activeIndex = 0;
            return zone;
        },
        move(step) {
            if (!this.open) { this.openPicker(); return; }
            if (!this.matches.length) return;
            this.activeIndex = (this.activeIndex + step + this.matches.length) % this.matches.length;
            this.$nextTick?.(() => this.$refs.options?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
        },
    };
}

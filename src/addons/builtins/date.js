import { weekdayText } from '../../i18n.js';

export const dateAddon = {
    kind: 'date', label: 'Date', labelKey: 'addons.date',
    description: 'Show the local calendar date.', maxInstances: 1,
    viewKey: 'shared', settingsViewKey: 'date',
    createOptions: () => ({ format: 'ymd', show_weekday: false }),
    describe: (_addon, { t }) => ({ name: t('addons.date'), subtitle: t('addons.localDate') }),
    display(addon, { now, language }) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return {
            text: addon.options.format === 'd' ? day
                : addon.options.format === 'md' ? `${month}-${day}` : `${year}-${month}-${day}`,
            weekday: addon.options.show_weekday === true ? weekdayText(now, language) : '',
        };
    },
    actions: () => [],
    editor: {
        setOption(addon, field, value) {
            if (field === 'format' && ['ymd', 'md', 'd'].includes(value)) addon.options.format = value;
            else if (field === 'show_weekday' && typeof value === 'boolean') addon.options.show_weekday = value;
            else return false;
            return true;
        },
    },
};

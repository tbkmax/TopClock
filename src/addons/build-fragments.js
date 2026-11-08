import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { addonDefinitions } from './registry.js';

const viewRoot = realpathSync(resolve(import.meta.dirname, 'views'));
const slots = new Set(['clock-row', 'settings-row', 'preview-row', 'clock-types', 'settings-types']);
for (const definition of addonDefinitions) {
    if (definition.viewKey !== 'shared') slots.add(`clock-${definition.viewKey}`);
    slots.add(`settings-${definition.settingsViewKey}`);
}
const marker = /<!-- addon-view:([a-z-]+) -->/g;

export function composeAddonFragments(html, chain = []) {
    return html.replace(marker, (_match, key) => {
        if (!slots.has(key) || chain.includes(key)) throw new Error(`Invalid add-on view slot: ${key}`);
        if (key === 'clock-types' || key === 'settings-types') {
            const type = key === 'clock-types' ? 'clock' : 'settings';
            const views = type === 'clock'
                ? [...new Set(addonDefinitions.map((definition) => definition.viewKey).filter((view) => view !== 'shared'))]
                : [...new Set(addonDefinitions.map((definition) => definition.settingsViewKey))];
            return views.map((view) => {
                return composeAddonFragments(`<!-- addon-view:${type}-${view} -->`, [...chain, key]);
            }).join('\n');
        }
        const file = key.startsWith('settings-') && key !== 'settings-row'
            ? `${key.slice('settings-'.length)}.html` : `${key}.html`;
        const path = realpathSync(resolve(viewRoot, file));
        if (!path.startsWith(viewRoot + sep)) throw new Error(`Add-on view escapes its bundle: ${key}`);
        return composeAddonFragments(readFileSync(path, 'utf8'), [...chain, key]);
    });
}

export function addonFragmentsPlugin() {
    return {
        name: 'bundled-addon-fragments',
        transformIndexHtml(html) {
            if (html.includes('x-data="clockApp"') && !html.includes('<!-- addon-view:clock-row -->')) {
                throw new Error('Clock add-on view slot is missing');
            }
            if (html.includes('x-data="settingsApp"') && !html.includes('<!-- addon-view:settings-row -->')) {
                throw new Error('Settings add-on view slot is missing');
            }
            const composed = composeAddonFragments(html);
            if (composed.includes('<!-- addon-view:')) throw new Error('Unresolved add-on view slot');
            return composed;
        },
    };
}

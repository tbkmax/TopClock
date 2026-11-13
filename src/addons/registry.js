import { dateAddon } from './builtins/date.js';
import { regionClockAddon } from './builtins/region-clock.js';
import { timerAddon } from './builtins/timer.js';
import { progressAddon } from './builtins/progress.js';
import { counterAddon } from './builtins/counter.js';

/** @typedef {{kind:string, label:string, labelKey:string, description:string, maxInstances:number,
 * viewKey:string, settingsViewKey:string, detailsViewKey?:string, createOptions:function, describe:function,
 * display:function, actions:function, editor:object}} AddonDefinition */
const definitions = [dateAddon, regionClockAddon, timerAddon, progressAddon, counterAddon];
const knownActions = new Set(['toggle', 'reset', 'start_positive', 'start_negative', 'stop']);
const kinds = new Set();
for (const definition of definitions) {
    if (kinds.has(definition.kind) || !definition.viewKey || !definition.settingsViewKey
        || !Number.isInteger(definition.maxInstances)
        || ['createOptions', 'describe', 'display', 'actions'].some((key) => typeof definition[key] !== 'function')
        || !definition.editor || typeof definition.editor !== 'object') {
        throw new Error(`Invalid add-on definition: ${definition.kind}`);
    }
    kinds.add(definition.kind);
    const sample = { id: 'sample', kind: definition.kind, enabled: true, options: definition.createOptions({ now: new Date(0) }) };
    for (const action of definition.actions(sample, { timerSession: null, progressTimerSessions: {}, counterSession: null })) {
        if (!knownActions.has(action.id) || !Array.isArray(action.roles)) throw new Error(`Invalid action for ${definition.kind}`);
    }
}
export const addonDefinitions = Object.freeze(definitions);
export const addonCatalog = definitions.map((definition) => ({
    kind: definition.kind, label: definition.label, description: definition.description,
    hasDetails: Boolean(definition.detailsViewKey),
    options: definition.createOptions({ now: new Date() }),
}));
export function getAddonDefinition(kind) {
    return definitions.find((definition) => definition.kind === kind);
}

import { getAddonDefinition } from './registry.js';

export function createAddonController({ getSettings, getState, dispatchNative, dispatchMenuChoiceNative, beforeAction = async () => true }) {
    function instance(id) {
        return (getSettings()?.addons || []).find((addon) => addon.id === id);
    }
    function actionsFor(addon, role) {
        if (!addon) return [];
        const definition = getAddonDefinition(addon.kind);
        return (definition?.actions(addon, getState()) || []).filter((action) => action.roles.includes(role));
    }
    return {
        actionsFor,
        menuActions() {
            return (getSettings()?.addons || []).flatMap((addon) =>
                actionsFor(addon, 'clock-menu').filter((action) => action.enabled)
                    .map((action) => ({ ...action, instanceId: addon.id })));
        },
        menuEntries(t, nowMs = Date.now()) {
            const settings = getSettings();
            return (settings?.addons || []).flatMap((addon) => {
                const actions = actionsFor(addon, 'clock-menu').filter((action) => action.enabled);
                if (!actions.length) return [];
                const definition = getAddonDefinition(addon.kind);
                if (!definition.menu?.grouped) {
                    return actions.map((action) => ({ type: 'action', instanceId: addon.id, action }));
                }
                const context = { settings, state: getState(), nowMs };
                const sections = definition.menu.sections?.(addon, context)
                    || [{ id: 'set', labelKey: 'addons.setPreset', choices: definition.menu.choices?.(addon, context) || [] }];
                return [{
                    type: 'group', instanceId: addon.id,
                    name: definition.describe(addon, { t, settings }).name,
                    actions,
                    sections,
                    choices: sections.flatMap((section) => section.choices),
                }];
            });
        },
        async dispatchMenuChoice(id, choiceId, confirmation = {}) {
            const findChoice = () => this.menuEntries((key) => key)
                .find((entry) => entry.type === 'group' && entry.instanceId === id)
                ?.choices.find((choice) => choice.id === choiceId);
            if (!findChoice()) throw new Error('Add-on menu choice is unavailable');
            if (!await beforeAction()) return null;
            const choice = findChoice();
            const addon = instance(id);
            if (!choice || !addon || !dispatchMenuChoiceNative) throw new Error('Add-on menu choice is unavailable');
            return dispatchMenuChoiceNative(addon, choice, confirmation);
        },
        async dispatch(id, actionId, role) {
            let addon = instance(id);
            if (!actionsFor(addon, role).some((action) => action.id === actionId && action.enabled)) {
                throw new Error('Add-on action is unavailable');
            }
            if (!await beforeAction()) return null;
            addon = instance(id);
            if (!actionsFor(addon, role).some((action) => action.id === actionId && action.enabled)) {
                throw new Error('Add-on action is unavailable');
            }
            return dispatchNative(addon, actionId);
        },
    };
}

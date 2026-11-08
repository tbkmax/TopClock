import { getAddonDefinition } from './registry.js';

export function createAddonController({ getSettings, getState, dispatchNative, beforeAction = async () => true }) {
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

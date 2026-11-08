import { createAddonController } from './controller.js';
import { createAddonState } from './state.js';

// One reactive session store feeds both the add-on controller and its page.
export function createAddonHost({ reactive, getSettings, onChange = () => {}, beforeAction, adapter }) {
    const state = createAddonState({ reactive, onChange, adapter });
    const controller = createAddonController({
        getSettings,
        getState: () => state.snapshot,
        dispatchNative: (addon, action) => state.dispatch(addon, action),
        beforeAction,
    });
    return {
        get snapshot() { return state.snapshot; },
        start: () => state.start(),
        dispose: () => state.dispose(),
        setTimer: (session) => state.setTimer(session),
        setProgress: (sessions) => state.setProgress(sessions),
        actionsFor: (addon, role) => controller.actionsFor(addon, role),
        menuActions: () => controller.menuActions(),
        dispatch: (id, action, role) => controller.dispatch(id, action, role),
    };
}

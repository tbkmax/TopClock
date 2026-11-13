import { createAddonController } from './controller.js';
import { createAddonState } from './state.js';

// One reactive session store feeds both the add-on controller and its page.
export function createAddonHost({ reactive, getSettings, onChange = () => {}, beforeAction, adapter }) {
    const state = createAddonState({ reactive, onChange, adapter });
    const controller = createAddonController({
        getSettings,
        getState: () => state.snapshot,
        dispatchNative: (addon, action, options) => state.dispatch(addon, action, options),
        dispatchMenuChoiceNative: (addon, choice, confirmation) => state.dispatchMenuChoice(addon, choice, confirmation),
        beforeAction,
    });
    return {
        get snapshot() { return state.snapshot; },
        start: () => state.start(),
        dispose: () => state.dispose(),
        setTimer: (session) => state.setTimer(session),
        setProgress: (sessions) => state.setProgress(sessions),
        setCounter: (session) => state.setCounter(session),
        actionsFor: (addon, role) => controller.actionsFor(addon, role),
        menuActions: () => controller.menuActions(),
        menuEntries: (t) => controller.menuEntries(t),
        dispatchMenuChoice: (id, choiceId, confirmation) => controller.dispatchMenuChoice(id, choiceId, confirmation),
        dispatch: (id, action, role, options) => controller.dispatch(id, action, role, options),
    };
}

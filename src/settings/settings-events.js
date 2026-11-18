// Keep native event names and window hooks in one place. Callers provide the
// page reactions, so this module does not depend on Alpine component state.
export async function subscribeSettingsEvents({
    listen, settingsWindow, onSettingsChanged, onHotkeyErrorsChanged,
    onDisplaysChanged, onPaletteClose, onClose, onFocus, onResize,
}) {
    const unlisten = [];
    try {
        unlisten.push(await listen('clock-settings-changed', ({ payload }) => onSettingsChanged(payload)));
        unlisten.push(await listen('hotkey-errors-changed', ({ payload }) => onHotkeyErrorsChanged(payload)));
        unlisten.push(await listen('displays-changed', ({ payload }) => onDisplaysChanged(payload)));
        unlisten.push(await listen('palette-request-settings-close', onPaletteClose));
        unlisten.push(await settingsWindow.onCloseRequested((event) => {
            event.preventDefault();
            onClose();
        }));
        unlisten.push(await settingsWindow.onFocusChanged(({ payload }) => onFocus(payload)));
        unlisten.push(await settingsWindow.onResized(onResize));
    } catch (error) {
        for (const dispose of unlisten.reverse()) dispose();
        throw error;
    }
    return () => { for (const dispose of unlisten.reverse()) dispose(); };
}

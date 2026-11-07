// WebView2 can report a hidden native window as a visible document.
export function createSettingsPreview(window, render, {
    schedule = setInterval,
    cancel = clearInterval,
} = {}) {
    let timer = null;
    let request = 0;
    return {
        get running() { return timer !== null; },
        async refresh() {
            const current = ++request;
            const [visible, minimized] = await Promise.all([window.isVisible(), window.isMinimized()]);
            if (current !== request) return;
            if (visible && !minimized) {
                if (timer === null) {
                    timer = schedule(render, 200);
                    render();
                }
            } else {
                cancel(timer);
                timer = null;
            }
        },
    };
}

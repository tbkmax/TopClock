import { clockFontStack, timeParts } from '../time-format.js';
import { markChangedNumbers } from '../clock-animations.js';
import { displayAddon } from '../addons/model.js';
import { displayLayout } from '../addons/layout.js';
import { markCountdownCompletion, progressBarStyle } from '../addons/builtins/progress-display.js';

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

// Settings composes these page-local render methods into its Alpine component.
export const createPreviewMethods = (getPreviewClock) => ({
    async syncPreviewTimer() {
        try {
            await getPreviewClock().refresh();
        } catch (error) {
            console.error('Could not check Settings window visibility:', error);
        }
    },

    updatePreview() {
        if (!getPreviewClock()?.running) return;
        const now = new Date();
        const result = markChangedNumbers(
            timeParts(now, this.settings),
            this.previousPreviewNumbers,
            this.previewNumberActiveUntil,
            now.getTime(),
        );
        this.previewParts = result.parts;
        this.previousPreviewNumbers = result.numbers;
        this.previewNumberActiveUntil = result.activeUntil;
        this.previewAddons = (this.settings.addons || []).filter((addon) => addon.enabled)
            .map((addon) => {
                const display = displayAddon(addon, now, this.settings, {
                    timerSession: this.timerSession, progressTimerSessions: this.progressTimerSessions,
                    counterSession: this.counterSession, language: this.language,
                });
                markCountdownCompletion(display, addon, this.progressPreviousPercent, this.progressCompletionUntil, now.getTime());
                return display;
            })
            .filter((addon) => !addon.hidden);
    },
    previewLayout() { return displayLayout(this.previewAddons, this.settings.addon_pairs); },

    previewStyle() {
        return {
            opacity: 1 - this.settings.default_transparency_percent / 100,
            color: this.settings.font_color,
            fontSize: `${Math.min(this.settings.font_size, 64)}px`,
            fontFamily: clockFontStack(this.settings.font_family),
            WebkitTextStroke: `${this.settings.outline_width}px ${this.settings.outline_color}`,
            textShadow: '0 2px 6px rgba(0, 0, 0, .65)',
        };
    },

    addonPreviewStyle(addon) {
        return {
            ...addon.glowStyle,
            color: addon.color || this.settings.font_color,
            fontSize: `${Math.min(this.settings.font_size, 64) * (addon.effective_size_percent ?? addon.size_percent) / 100}px`,
            fontFamily: clockFontStack(this.settings.font_family),
            WebkitTextStroke: `${this.settings.outline_width}px ${this.settings.outline_color}`,
        };
    },
    progressStyle(addon) { return progressBarStyle(addon, Math.min(this.settings.font_size, 64)); },
});

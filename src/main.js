import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { clockFontStack, timeParts } from './time-format.js';
import { markChangedNumbers } from './clock-animations.js';
import { clockWindowLayout } from './clock-layout.js';
import { displayAddon } from './addons/model.js';
import { createAddonHost } from './addons/host.js';
import { markCountdownCompletion, progressBarStyle } from './addons/builtins/progress-display.js';
import { localizeDocument, resolveLanguage, translate } from './i18n.js';
import './style.css';
import './addons/builtins/progress.css';

const appWindow = getCurrentWindow();
let resizeQueue = Promise.resolve();
let isFirstResize = true;
let lastMainRightOffset = 0;
let lastMainTopOffset = 0;

window.Alpine = Alpine;

Alpine.data('clockApp', () => ({
    parts: [],
    renderedAddons: [],
    addonPreviousNumbers: {},
    addonNumberActiveUntil: {},
    addonHost: null,
    get timerSession() { return this.addonHost?.snapshot.timerSession ?? null; },
    get progressTimerSessions() { return this.addonHost?.snapshot.progressTimerSessions ?? {}; },
    progressPreviousPercent: {},
    progressCompletionUntil: {},
    previousNumbers: {},
    numberActiveUntil: {},
    settings: null,
    systemLocale: 'en',
    language: 'en',
    isCtrlHeld: false,
    isNear: false,
    dragStart: null,
    dragStarted: false,
    isDragging: false,
    dragRaf: null,
    lastTargetX: 0,
    lastTargetY: 0,
    resizeTimer: null,

    async init() {
        this.addonHost = createAddonHost({
            reactive: Alpine.reactive,
            getSettings: () => this.settings,
            onChange: () => this.updateClock(),
        });
        this.systemLocale = await invoke('get_system_locale').catch(() => navigator.language || 'en');
        this.syncLanguage();
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 200);
        this.loadSettings();
        this.addonHost.start().catch(console.error);
        this.$nextTick(() => {
            new ResizeObserver(() => this.scheduleResize()).observe(this.$refs.clockContainer);
            this.scheduleResize();
        });

        await Promise.all([
            listen('ctrl-state', (event) => {
                this.isCtrlHeld = event.payload;
            }),
            listen('proximity', (event) => {
                this.isNear = event.payload;
            }),
            listen('clock-settings-changed', (event) => {
                this.applySettings(event.payload);
                this.updateClock();
            }),
            listen('clock-settings-preview', (event) => {
                this.applySettings(event.payload);
                this.updateClock();
            }),
        ]);

        window.addEventListener('keydown', (event) => {
            const modifierKey = this.settings?.shortcuts?.interaction_modifier || 'Ctrl';
            const expectedKey = modifierKey === 'Ctrl' ? 'Control' : modifierKey;
            if (event.key === expectedKey) this.isCtrlHeld = true;

        });

        window.addEventListener('keyup', (event) => {
            const modifierKey = this.settings?.shortcuts?.interaction_modifier || 'Ctrl';
            const expectedKey = modifierKey === 'Ctrl' ? 'Control' : modifierKey;
            if (event.key === expectedKey) this.isCtrlHeld = false;
        });
        window.addEventListener('contextmenu', (event) => event.preventDefault());
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        window.addEventListener('mouseup', () => this.handleMouseUp());

    },

    destroy() {
        this.addonHost?.dispose();
        clearInterval(this.clockInterval);
    },

    async loadSettings() {
        let reportedError = false;
        while (!this.settings) {
            try {
                this.applySettings(await invoke('get_settings'));
                this.updateClock();
                return;
            } catch (error) {
                if (!reportedError) {
                    console.error('Could not load clock settings:', error);
                    reportedError = true;
                }
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
        }
    },

    applySettings(settings) {
        this.settings = settings;
        this.syncLanguage();
        this.updateClock();
        document.documentElement.style.setProperty('--clock-font-color', settings.font_color);
        document.documentElement.style.setProperty('--clock-outline-color', settings.outline_color);
        document.documentElement.style.setProperty('--clock-outline-width', `${settings.outline_width}px`);
        document.documentElement.style.setProperty('--clock-font-size', `${settings.font_size}px`);
        document.documentElement.style.setProperty('--clock-font-family', clockFontStack(settings.font_family));
        this.$nextTick(() => this.scheduleResize());
    },

    syncLanguage() {
        this.language = resolveLanguage(this.settings?.language || 'system', this.systemLocale);
        document.documentElement.lang = this.language;
        localizeDocument(this.language);
    },

    t(key, vars) { return translate(this.language, key, vars); },

    progressStyle(addon) { return progressBarStyle(addon, this.settings?.font_size || 42); },

    scheduleResize() {
        if (!this.settings) return;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            if (!this.$refs.clockContainer) return;
            resizeQueue = resizeQueue.then(async () => {
                // Measure inside the queue, after Alpine has applied the latest state.
                // Offset sizes exclude the clock's pressed transform.
                const container = this.$refs.clockContainer;
                const layout = clockWindowLayout(container.offsetWidth, container.offsetHeight);
                const { width, height } = layout;
                const oldSize = await appWindow.outerSize();
                const scale = await appWindow.scaleFactor();
                const oldPosition = await appWindow.outerPosition();
                const targetMainRight = oldPosition.x + lastMainRightOffset * scale;
                const targetMainTop = oldPosition.y + lastMainTopOffset * scale;
                if (Math.abs(oldSize.width - width * scale) >= 2
                    || Math.abs(oldSize.height - height * scale) >= 2) {
                    await appWindow.setSize(new LogicalSize(width, height));
                }
                // Layout offsets stay stable during the container's pressed animation.
                const digits = this.$refs.clockDigits;
                const mainRight = digits.offsetLeft + digits.offsetWidth;
                const mainTop = digits.offsetTop;
                const newX = isFirstResize
                    ? oldPosition.x
                    : Math.round(targetMainRight - mainRight * scale);
                const newY = isFirstResize
                    ? oldPosition.y
                    : Math.round(targetMainTop - mainTop * scale);
                isFirstResize = false;
                lastMainRightOffset = mainRight;
                lastMainTopOffset = mainTop;
                await appWindow.setPosition(new PhysicalPosition(newX, newY));
            }).catch(console.error);
        }, 40);
    },

    updateClock() {
        const now = new Date();
        const result = markChangedNumbers(
            timeParts(now, this.settings || { time_layout: 'hms', twenty_four_hour: true }),
            this.previousNumbers,
            this.numberActiveUntil,
            now.getTime(),
        );
        this.parts = result.parts;
        this.previousNumbers = result.numbers;
        this.numberActiveUntil = result.activeUntil;
        this.renderedAddons = (this.settings?.addons || []).filter((addon) => addon.enabled).map((addon) => {
            const display = displayAddon(addon, now, this.settings, this.timerSession, this.language, this.progressTimerSessions);
            markCountdownCompletion(display, addon, this.progressPreviousPercent, this.progressCompletionUntil, now.getTime());
            if (display.parts) {
                const animation = markChangedNumbers(display.parts, this.addonPreviousNumbers[addon.id], this.addonNumberActiveUntil[addon.id], now.getTime());
                display.parts = animation.parts;
                this.addonPreviousNumbers[addon.id] = animation.numbers;
                this.addonNumberActiveUntil[addon.id] = animation.activeUntil;
            }
            return display;
        }).filter((addon) => !addon.hidden);
    },

    addonActions(addon, role) { return this.addonHost?.actionsFor(addon, role) || []; },
    addonClick(addon) {
        if (this.dragStarted) { this.dragStarted = false; return; }
        if (!this.isCtrlHeld) return;
        const action = this.addonActions(addon, 'primary-click').find((item) => item.enabled);
        if (action) this.addonHost.dispatch(addon.id, action.id, 'primary-click').catch(console.error);
    },

    toggleFormat() {
        if (this.dragStarted) {
            this.dragStarted = false;
            return;
        }
        if (this.isCtrlHeld && this.settings) {
            this.settings.twenty_four_hour = !this.settings.twenty_four_hour;
            invoke('update_settings', { settings: this.settings }).catch(console.error);
            this.updateClock();
        }
    },

    async handleMouseDown(event) {
        this.dragStarted = false;
        if (event.button === 0 && this.isCtrlHeld) {
            const pos = await appWindow.outerPosition();
            const scale = await appWindow.scaleFactor();
            this.dragStart = {
                mouseX: event.screenX,
                mouseY: event.screenY,
                winX: pos.x,
                winY: pos.y,
                scale: scale,
            };
            this.isDragging = false;
        } else {
            this.dragStart = null;
        }
    },

    handleMouseMove(event) {
        if (!this.dragStart || !(event.buttons & 1)) {
            if (this.isDragging) {
                this.handleMouseUp();
            }
            return;
        }
        const dx = event.screenX - this.dragStart.mouseX;
        const dy = event.screenY - this.dragStart.mouseY;
        if (!this.isDragging) {
            if (Math.hypot(dx, dy) > 3) {
                this.isDragging = true;
                this.dragStarted = true;
            } else {
                return;
            }
        }
        const targetX = Math.round(this.dragStart.winX + dx * this.dragStart.scale);
        const targetY = Math.round(this.dragStart.winY + dy * this.dragStart.scale);
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        if (!this.dragRaf) {
            this.dragRaf = requestAnimationFrame(() => {
                this.dragRaf = null;
                appWindow.setPosition(new PhysicalPosition(this.lastTargetX, this.lastTargetY)).catch(console.error);
            });
        }
    },

    handleMouseUp() {
        if (this.isDragging) {
            if (this.dragRaf) {
                cancelAnimationFrame(this.dragRaf);
                this.dragRaf = null;
                appWindow.setPosition(new PhysicalPosition(this.lastTargetX, this.lastTargetY)).catch(console.error);
            }
            this.isDragging = false;
            this.dragStart = null;
        }
    },

    handleContextMenu(event) {
        event.preventDefault();
        if (!this.isCtrlHeld) return;
        invoke('open_clock_menu', { clientX: event.clientX, clientY: event.clientY }).catch(console.error);
    },
}));

Alpine.start();

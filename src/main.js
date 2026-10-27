import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { clockFontStack, timeParts } from './time-format.js';
import { markChangedNumbers } from './clock-animations.js';
import './style.css';

const appWindow = getCurrentWindow();
let resizeQueue = Promise.resolve();
let isFirstResize = true;
function matchShortcut(event, shortcutString) {
    if (!shortcutString || typeof shortcutString !== 'string') return false;
    const parts = shortcutString.split('+').map((p) => p.trim());
    const mods = parts.filter((p) => ['Ctrl', 'Alt', 'Shift'].includes(p));
    const mainKey = parts.find((p) => !['Ctrl', 'Alt', 'Shift'].includes(p));

    const ctrlMatch = event.ctrlKey === mods.includes('Ctrl');
    const altMatch = event.altKey === mods.includes('Alt');
    const shiftMatch = event.shiftKey === mods.includes('Shift');

    if (!ctrlMatch || !altMatch || !shiftMatch) return false;
    if (!mainKey) return true;

    if (mainKey === 'Space') return event.key === ' ' || event.code === 'Space';
    return event.key.toLowerCase() === mainKey.toLowerCase();
}

window.Alpine = Alpine;

Alpine.data('clockApp', () => ({
    parts: [],
    previousNumbers: {},
    numberActiveUntil: {},
    settings: null,
    isCtrlHeld: false,
    isNear: false,
    menuOpen: false,
    menuX: 0,
    menuY: 0,
    dragStart: null,
    dragStarted: false,
    isDragging: false,
    dragRaf: null,
    lastTargetX: 0,
    lastTargetY: 0,
    resizeTimer: null,

    async init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 200);
        this.loadSettings();
        this.$nextTick(() => {
            new ResizeObserver(() => this.scheduleResize()).observe(this.$refs.clockDigits);
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

            const quitShortcut = this.settings?.shortcuts?.quit ?? 'Ctrl+Q';
            if (matchShortcut(event, quitShortcut)) {
                event.preventDefault();
                this.quitApp();
            }

            const settingsShortcut = this.settings?.shortcuts?.open_settings ?? 'Ctrl+,';
            if (matchShortcut(event, settingsShortcut)) {
                event.preventDefault();
                this.openSettings();
            }

            if (event.key === 'Escape' && this.menuOpen) this.closeMenu();
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
        document.documentElement.style.setProperty('--clock-font-color', settings.font_color);
        document.documentElement.style.setProperty('--clock-outline-color', settings.outline_color);
        document.documentElement.style.setProperty('--clock-outline-width', `${settings.outline_width}px`);
        document.documentElement.style.setProperty('--clock-font-size', `${settings.font_size}px`);
        document.documentElement.style.setProperty('--clock-font-family', clockFontStack(settings.font_family));
        this.$nextTick(() => this.scheduleResize());
    },

    scheduleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            if (!this.$refs.clockContainer) return;
            const containerRect = this.$refs.clockContainer.getBoundingClientRect();
            const minWidth = this.menuOpen ? 138 : 60;
            const width = Math.max(minWidth, Math.ceil(containerRect.width) + 4);
            const baseHeight = Math.ceil(containerRect.height) + 2;
            let menuExtraHeight = 0;
            if (this.menuOpen) {
                const measuredHeight = this.$refs.dropdownMenu ? Math.ceil(this.$refs.dropdownMenu.getBoundingClientRect().height) : 0;
                menuExtraHeight = measuredHeight > 0 ? measuredHeight + 4 : 78;
            }
            const height = baseHeight + menuExtraHeight;
            resizeQueue = resizeQueue.then(async () => {
                const oldSize = await appWindow.outerSize();
                const scale = await appWindow.scaleFactor();
                if (Math.abs(oldSize.width - width * scale) < 2
                    && Math.abs(oldSize.height - height * scale) < 2) return;
                const oldPosition = await appWindow.outerPosition();
                await appWindow.setSize(new LogicalSize(width, height));
                const newSize = await appWindow.outerSize();
                const newX = isFirstResize
                    ? oldPosition.x
                    : oldPosition.x + oldSize.width - newSize.width;
                isFirstResize = false;
                await appWindow.setPosition(new PhysicalPosition(newX, oldPosition.y));
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
        const containerHeight = this.$refs.clockContainer ? Math.ceil(this.$refs.clockContainer.getBoundingClientRect().height) : 48;
        this.menuX = Math.max(4, Math.min(event.clientX, window.innerWidth - 134));
        this.menuY = containerHeight;
        this.openMenu();
    },

    openMenu() {
        this.menuOpen = true;
        invoke('set_menu_open', { open: true }).catch(console.error);
        this.scheduleResize();
    },

    closeMenu() {
        this.menuOpen = false;
        invoke('set_menu_open', { open: false }).catch(console.error);
        this.scheduleResize();
    },

    openSettings() {
        this.closeMenu();
        invoke('open_settings').catch(console.error);
    },

    quitApp() {
        invoke('quit').catch(console.error);
    },
}));

Alpine.start();

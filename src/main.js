import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { clockFontStack, timeParts } from './time-format.js';
import './style.css';

const appWindow = getCurrentWindow();
let resizeQueue = Promise.resolve();
window.Alpine = Alpine;

Alpine.data('clockApp', () => ({
    parts: [],
    lastSecond: null,
    settings: null,
    isTicking: false,
    isCtrlHeld: false,
    isNear: false,
    menuOpen: false,
    menuX: 0,
    menuY: 0,
    dragStart: null,
    dragStarted: false,
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
            if (event.key === 'Control') this.isCtrlHeld = true;
            if (event.ctrlKey && event.key.toLowerCase() === 'q') {
                event.preventDefault();
                this.quitApp();
            }
            if (event.key === 'Escape' && this.menuOpen) this.closeMenu();
        });
        window.addEventListener('contextmenu', (event) => event.preventDefault());

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
            const width = Math.max(150, Math.ceil(this.$refs.clockDigits.getBoundingClientRect().width) + 24);
            resizeQueue = resizeQueue.then(async () => {
                const oldSize = await appWindow.outerSize();
                const scale = await appWindow.scaleFactor();
                if (Math.abs(oldSize.width - width * scale) < 2) return;
                const oldPosition = await appWindow.outerPosition();
                await appWindow.setSize(new LogicalSize(width, 110));
                const newSize = await appWindow.outerSize();
                await appWindow.setPosition(new PhysicalPosition(oldPosition.x + oldSize.width - newSize.width, oldPosition.y));
            }).catch(console.error);
        }, 40);
    },

    updateClock() {
        const now = new Date();
        if (this.lastSecond !== now.getSeconds()) {
            this.lastSecond = now.getSeconds();
            this.isTicking = true;
            setTimeout(() => { this.isTicking = false; }, 300);
        }
        this.parts = timeParts(now, this.settings || { time_layout: 'hms', twenty_four_hour: true });
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

    handleMouseDown(event) {
        this.dragStarted = false;
        this.dragStart = event.button === 0 && this.isCtrlHeld
            ? { x: event.screenX, y: event.screenY }
            : null;
    },

    handleMouseMove(event) {
        if (!this.dragStart || this.dragStarted || !(event.buttons & 1)) return;
        const dx = event.screenX - this.dragStart.x;
        const dy = event.screenY - this.dragStart.y;
        if (Math.hypot(dx, dy) > 3) {
            this.dragStarted = true;
            this.dragStart = null;
            appWindow.startDragging().catch(console.error);
        }
    },

    handleContextMenu(event) {
        event.preventDefault();
        if (!this.isCtrlHeld) return;
        this.menuX = Math.max(4, Math.min(event.clientX, window.innerWidth - 134));
        this.menuY = Math.max(4, Math.min(event.clientY, window.innerHeight - 48));
        this.openMenu();
    },

    openMenu() {
        this.menuOpen = true;
        invoke('set_menu_open', { open: true }).catch(console.error);
    },

    closeMenu() {
        this.menuOpen = false;
        invoke('set_menu_open', { open: false }).catch(console.error);
    },

    quitApp() {
        invoke('quit').catch(console.error);
    },
}));

Alpine.start();

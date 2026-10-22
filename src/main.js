import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './style.css';

const appWindow = getCurrentWindow();
window.Alpine = Alpine;

Alpine.data('clockApp', () => ({
    hours: '00',
    minutes: '00',
    seconds: '00',
    ampm: '',
    is24Hour: true,
    settings: null,
    isTicking: false,
    isCtrlHeld: false,
    isNear: false,
    menuOpen: false,
    menuX: 0,
    menuY: 0,
    dragStart: null,
    dragStarted: false,

    async init() {
        try {
            this.applySettings(await invoke('get_settings'));
        } catch (error) {
            console.error('Could not load clock settings:', error);
            this.applySettings({ blink: true, font_color: '#ffffff', outline_color: '#000000', font_size: 42, twenty_four_hour: true });
        }
        this.updateClock();
        setInterval(() => this.updateClock(), 200);

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

    applySettings(settings) {
        this.settings = settings;
        this.is24Hour = settings.twenty_four_hour;
        document.documentElement.style.setProperty('--clock-font-color', settings.font_color);
        document.documentElement.style.setProperty('--clock-outline-color', settings.outline_color);
        document.documentElement.style.setProperty('--clock-font-size', `${settings.font_size}px`);
    },

    updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        if (this.is24Hour) {
            this.ampm = '';
        } else {
            this.ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
        }

        const nextSeconds = String(seconds).padStart(2, '0');
        if (this.seconds !== nextSeconds) {
            this.seconds = nextSeconds;
            this.isTicking = true;
            setTimeout(() => { this.isTicking = false; }, 300);
        }

        this.hours = String(hours).padStart(2, '0');
        this.minutes = String(minutes).padStart(2, '0');
    },

    toggleFormat() {
        if (this.dragStarted) {
            this.dragStarted = false;
            return;
        }
        if (this.isCtrlHeld) {
            this.is24Hour = !this.is24Hour;
            this.settings.twenty_four_hour = this.is24Hour;
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

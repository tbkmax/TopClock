import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './settings.css';

const settingsWindow = getCurrentWindow();
window.Alpine = Alpine;

Alpine.data('settingsApp', () => ({
    tab: 'clock',
    settings: { blink: true, font_color: '#ffffff', outline_color: '#000000', font_size: 42, twenty_four_hour: true },
    startupEnabled: false,
    previewTime: '00:00:00',
    error: '',
    saveTimer: null,

    async init() {
        this.settings = await invoke('get_settings');
        this.startupEnabled = await invoke('get_startup_enabled');
        this.updatePreview();
        setInterval(() => this.updatePreview(), 1000);
        await listen('clock-settings-changed', (event) => { this.settings = event.payload; });
        await settingsWindow.onCloseRequested((event) => {
            event.preventDefault();
            this.close();
        });
    },

    updatePreview() {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !this.settings.twenty_four_hour };
        this.previewTime = new Intl.DateTimeFormat(undefined, options).format(now);
    },

    previewStyle() {
        return {
            color: this.settings.font_color,
            fontSize: `${this.settings.font_size}px`,
            WebkitTextStroke: `1.5px ${this.settings.outline_color}`,
            textShadow: `1px 1px 0 ${this.settings.outline_color}, -1px -1px 0 ${this.settings.outline_color}`,
        };
    },

    save() {
        this.updatePreview();
        clearTimeout(this.saveTimer);
        const settings = { ...this.settings };
        this.saveTimer = setTimeout(async () => {
            try {
                await invoke('update_settings', { settings });
                this.error = '';
            } catch (error) {
                this.error = `Could not save settings: ${error}`;
            }
        }, 80);
    },

    async toggleStartup() {
        const enabled = !this.startupEnabled;
        try {
            await invoke('set_startup_enabled', { enabled });
            this.startupEnabled = enabled;
            this.error = '';
        } catch (error) {
            this.error = `Could not update startup: ${error}`;
        }
    },

    startDrag(event) {
        if (event.button === 0 && !event.target.closest('button')) {
            settingsWindow.startDragging().catch(console.error);
        }
    },

    close() { invoke('hide_settings').catch(console.error); },
    minimize() { invoke('minimize_settings').catch(console.error); },
}));

Alpine.start();

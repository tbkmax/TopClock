import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { clockAnimations, clockFontStack, timeLayouts, timeParts } from './time-format.js';
import './settings.css';

const settingsWindow = getCurrentWindow();
let settingsSaveQueue = Promise.resolve(true);
window.Alpine = Alpine;

Alpine.data('settingsApp', () => ({
    tab: 'clock',
    settings: { blink: true, font_color: '#ffffff', outline_color: '#000000', outline_width: 1.5, font_size: 42, font_family: 'Segoe UI', twenty_four_hour: true, show_ampm: true, time_layout: 'hms', animation: 'classic' },
    startupEnabled: false,
    previewParts: [],
    previewTick: false,
    previewSecond: null,
    layouts: timeLayouts,
    animations: clockAnimations,
    fontFamilies: [],
    fontsLoading: true,
    fontListError: false,
    error: '',
    saveTimer: null,
    pendingSaves: 0,
    isSaving: false,

    async init() {
        this.settings = await invoke('get_settings');
        await this.loadFontFamilies();
        this.startupEnabled = await invoke('get_startup_enabled');
        this.updatePreview();
        setInterval(() => this.updatePreview(), 1000);
        await listen('clock-settings-changed', (event) => {
            if (!this.saveTimer && !this.isSaving) this.settings = event.payload;
        });
        await settingsWindow.onCloseRequested((event) => {
            event.preventDefault();
            this.close();
        });
    },

    updatePreview() {
        const now = new Date();
        if (this.previewSecond !== now.getSeconds()) {
            this.previewSecond = now.getSeconds();
            this.previewTick = true;
            setTimeout(() => { this.previewTick = false; }, 300);
        }
        this.previewParts = timeParts(now, this.settings);
    },

    previewStyle() {
        return {
            color: this.settings.font_color,
            fontSize: `${this.settings.font_size}px`,
            fontFamily: clockFontStack(this.settings.font_family),
            WebkitTextStroke: `${this.settings.outline_width}px ${this.settings.outline_color}`,
            textShadow: '0 2px 6px rgba(0, 0, 0, .65)',
        };
    },

    rangeStyle(value, min, max) {
        return { '--range-progress': `${((value - min) / (max - min)) * 100}%` };
    },

    async loadFontFamilies() {
        try {
            this.fontFamilies = await invoke('get_font_families');
            if (!this.fontFamilies.includes(this.settings.font_family)) {
                this.settings.font_family = this.fontFamilies.includes('Segoe UI')
                    ? 'Segoe UI' : this.fontFamilies[0];
                this.save();
            }
        } catch (error) {
            this.fontListError = true;
            this.error = `Could not list installed fonts: ${error}`;
        } finally {
            this.fontsLoading = false;
        }
    },

    save() {
        this.updatePreview();
        clearTimeout(this.saveTimer);
        const settings = { ...this.settings };
        emitTo('main', 'clock-settings-preview', settings).catch(console.error);
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.queueSave(settings);
        }, 80);
    },

    queueSave(settings) {
        this.pendingSaves++;
        this.isSaving = true;
        settingsSaveQueue = settingsSaveQueue.then(async () => {
            try {
                await invoke('update_settings', { settings });
                this.error = '';
                return true;
            } catch (error) {
                this.error = `Could not save settings: ${error}`;
                return false;
            }
        }).finally(() => {
            this.pendingSaves--;
            this.isSaving = this.pendingSaves > 0;
        });
        return settingsSaveQueue;
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

    async close() {
        let saved;
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
            saved = await this.queueSave({ ...this.settings });
        } else {
            saved = await settingsSaveQueue;
        }
        if (!saved) return;
        invoke('hide_settings').catch(console.error);
    },
    minimize() { invoke('minimize_settings').catch(console.error); },
}));

Alpine.start();

import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { clockFontStack, timeLayouts, timeParts } from './time-format.js';
import { colonAnimations, markChangedNumbers, numberAnimations } from './clock-animations.js';
import './settings.css';

const settingsWindow = getCurrentWindow();
let settingsSaveQueue = Promise.resolve(true);
window.Alpine = Alpine;

Alpine.data('settingsApp', () => ({
    tab: 'clock',
    settings: { colon_animation: 'pulse', number_animation: 'tick', font_color: '#ffffff', outline_color: '#000000', outline_width: 1.5, font_size: 42, font_family: 'Segoe UI', twenty_four_hour: true, show_ampm: true, time_layout: 'hms', auto_check_updates: true },
    startupEnabled: false,
    appVersion: '0.0.0',
    updateStatusText: 'v0.0.0',
    isCheckingUpdate: false,
    updateAvailable: false,
    pendingUpdate: null,
    isUpdating: false,
    updateProgress: 0,
    previewParts: [],
    previousPreviewNumbers: {},
    previewNumberActiveUntil: {},
    layouts: timeLayouts,
    colonAnimations,
    numberAnimations,
    fontFamilies: [],
    fontsLoading: true,
    fontListError: false,
    error: '',
    saveTimer: null,
    pendingSaves: 0,
    isSaving: false,

    async init() {
        this.settings = await invoke('get_settings');
        this.appVersion = await getVersion().catch(() => '0.0.0');
        this.updateStatusText = `Current version: v${this.appVersion}`;
        await this.loadFontFamilies();
        this.startupEnabled = await invoke('get_startup_enabled');
        this.updatePreview();
        setInterval(() => this.updatePreview(), 200);
        await listen('clock-settings-changed', (event) => {
            if (!this.saveTimer && !this.isSaving) this.settings = event.payload;
        });
        await settingsWindow.onCloseRequested((event) => {
            event.preventDefault();
            this.close();
        });
        if (this.settings.auto_check_updates) {
            this.checkForUpdates(false);
        }
    },

    updatePreview() {
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
    },

    previewStyle() {
        return {
            color: this.settings.font_color,
            fontSize: `${Math.min(this.settings.font_size, 64)}px`,
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

    async checkForUpdates(manual = false) {
        if (this.isCheckingUpdate || this.isUpdating) return;
        this.isCheckingUpdate = true;
        if (manual) {
            this.updateStatusText = 'Checking for updates…';
        }
        try {
            const update = await check();
            if (update?.available) {
                this.pendingUpdate = update;
                this.updateAvailable = true;
                this.updateStatusText = `Version ${update.version} available (current: v${this.appVersion})`;
            } else {
                this.pendingUpdate = null;
                this.updateAvailable = false;
                this.updateStatusText = `TopClock v${this.appVersion} is up to date`;
            }
        } catch (error) {
            console.warn('Update check failed:', error);
            if (manual) {
                this.updateStatusText = `Could not reach update server (v${this.appVersion})`;
            }
        } finally {
            this.isCheckingUpdate = false;
        }
    },

    async installUpdate() {
        if (!this.pendingUpdate || this.isUpdating) return;
        this.isUpdating = true;
        this.updateStatusText = 'Downloading update…';
        this.updateProgress = 0;
        try {
            let downloaded = 0;
            let contentLength = 0;
            await this.pendingUpdate.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                    contentLength = event.data.contentLength || 0;
                } else if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength;
                    if (contentLength > 0) {
                        this.updateProgress = Math.round((downloaded / contentLength) * 100);
                        this.updateStatusText = `Downloading update: ${this.updateProgress}%`;
                    }
                } else if (event.event === 'Finished') {
                    this.updateStatusText = 'Installing update and restarting…';
                }
            });
            await relaunch();
        } catch (error) {
            this.error = `Update failed: ${error}`;
            this.updateStatusText = `Update failed: ${error}`;
        } finally {
            this.isUpdating = false;
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

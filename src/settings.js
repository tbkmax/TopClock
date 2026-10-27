import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { clockFontStack, timeLayouts, timeParts } from './time-format.js';
import { colonAnimations, markChangedNumbers, numberAnimations } from './clock-animations.js';
import { addonCatalog, addonName, availableTimeZones, createAddon, displayAddon, timerElapsed } from './addons.js';
import './settings.css';

const settingsWindow = getCurrentWindow();
let settingsSaveQueue = Promise.resolve(true);
window.Alpine = Alpine;

function isNewerVersion(latest, current) {
    const cleanL = String(latest).replace(/^v/, '').split('.').map(Number);
    const cleanC = String(current).replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(cleanL.length, cleanC.length); i++) {
        const l = cleanL[i] || 0;
        const c = cleanC[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

const DEFAULT_SHORTCUTS = {
    interaction_modifier: 'Ctrl',
    open_settings: 'Ctrl+,',
    open_settings_enabled: false,
    quit: 'Ctrl+Alt+Q',
    quit_enabled: false,
    timer_toggle: 'Ctrl+Shift+S',
    timer_toggle_enabled: false,
    timer_reset: 'Ctrl+Shift+R',
    timer_reset_enabled: false,
};

function supportedGlobalKey(key) {
    return /^[A-Z0-9]$/.test(key)
        || /^F(?:[1-9]|1\d|2[0-4])$/.test(key)
        || [',', '.', '/', ';', "'", '[', ']', '\\', '-', '=', '`', 'Space', 'Enter', 'Tab',
            'Escape', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key);
}

Alpine.data('settingsApp', () => ({
    tab: 'clock',
    settings: {
        colon_animation: 'pulse',
        number_animation: 'tick',
        font_color: '#ffffff',
        outline_color: '#000000',
        outline_width: 1.5,
        font_size: 42,
        font_family: 'Segoe UI',
        twenty_four_hour: true,
        show_ampm: true,
        time_layout: 'hms',
        auto_check_updates: true,
        shortcuts: { ...DEFAULT_SHORTCUTS },
        addons: [],
        timer_reset_warning_dismissed: false,
    },
    recordingAction: null,
    recordListener: null,
    startupEnabled: false,
    appVersion: '0.0.0',
    updateStatusText: 'v0.0.0',
    isCheckingUpdate: false,
    updateAvailable: false,
    latestReleaseUrl: 'https://github.com/tbkmax/TopClock/releases/latest',
    latestReleaseTag: '',
    previewParts: [],
    previewAddons: [],
    timerSession: null,
    pendingTimerChange: null,
    suppressResetPrompt: false,
    addonCatalog,
    timeZones: availableTimeZones(),
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
        this.timerSession = await invoke('get_timer_state');
        this.hotkeyErrors = await invoke('get_hotkey_errors');
        this.appVersion = await getVersion().catch(() => '0.0.0');
        this.updateStatusText = `Current version: v${this.appVersion}`;
        await this.loadFontFamilies();
        this.startupEnabled = await invoke('get_startup_enabled');
        this.updatePreview();
        setInterval(() => this.updatePreview(), 200);
        await listen('clock-settings-changed', (event) => {
            if (!this.saveTimer && !this.isSaving) this.settings = event.payload;
        });
        await listen('timer-state-changed', (event) => {
            this.timerSession = event.payload;
            this.updatePreview();
        });
        await listen('hotkey-errors-changed', (event) => { this.hotkeyErrors = event.payload; });
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
        this.previewAddons = (this.settings.addons || []).filter((addon) => addon.enabled)
            .map((addon) => displayAddon(addon, now, this.settings, this.timerSession));
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

    addonPreviewStyle(addon) {
        return {
            color: this.settings.font_color,
            fontSize: `${Math.min(this.settings.font_size, 64) * addon.size_percent / 100}px`,
            fontFamily: clockFontStack(this.settings.font_family),
            WebkitTextStroke: `${this.settings.outline_width}px ${this.settings.outline_color}`,
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
        const settings = JSON.parse(JSON.stringify(this.settings));
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

    hotkeyErrors: [],

    get timerAddonEnabled() {
        return (this.settings.addons || []).some((addon) => addon.kind === 'timer' && addon.enabled);
    },

    hasAddon(kind) { return (this.settings.addons || []).some((addon) => addon.kind === kind); },
    addonName,

    addAddon(kind) {
        if (kind !== 'region_clock' && this.hasAddon(kind)) return;
        if (this.settings.addons.length >= 16) return;
        this.settings.addons.push(createAddon(kind));
        this.save();
    },

    removeAddon(id) {
        this.settings.addons = this.settings.addons.filter((addon) => addon.id !== id);
        this.save();
    },

    moveAddon(id, direction) {
        const index = this.settings.addons.findIndex((addon) => addon.id === id);
        if (index < 0) return;
        const placement = this.settings.addons[index].placement;
        let other = index + direction;
        while (other >= 0 && other < this.settings.addons.length && this.settings.addons[other].placement !== placement) other += direction;
        if (other < 0 || other >= this.settings.addons.length) return;
        [this.settings.addons[index], this.settings.addons[other]] = [this.settings.addons[other], this.settings.addons[index]];
        this.save();
    },

    timerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer || this.timerSession?.running || timer.options[field] === value) return;
        const elapsed = timerElapsed(this.timerSession, Date.now());
        if (elapsed > 0 && !this.settings.timer_reset_warning_dismissed) {
            this.pendingTimerChange = { field, value };
            this.suppressResetPrompt = false;
            return;
        }
        this.applyTimerChange(field, value);
    },

    applyTimerChange(field, value) {
        const timer = this.settings.addons.find((addon) => addon.kind === 'timer');
        if (!timer) return;
        timer.options[field] = value;
        this.timerSession = { running: false, elapsed_ms: 0, started_at_ms: null, finished: false };
        this.save();
    },

    confirmTimerChange() {
        if (!this.pendingTimerChange) return;
        if (this.timerSession?.running) {
            this.error = 'Pause the timer before changing its mode or duration.';
            this.pendingTimerChange = null;
            return;
        }
        if (this.suppressResetPrompt) this.settings.timer_reset_warning_dismissed = true;
        this.applyTimerChange(this.pendingTimerChange.field, this.pendingTimerChange.value);
        this.pendingTimerChange = null;
    },

    cancelTimerChange() { this.pendingTimerChange = null; },

    async runTimerAction(action) {
        let saved;
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
            saved = await this.queueSave(JSON.parse(JSON.stringify(this.settings)));
        } else {
            saved = await settingsSaveQueue;
        }
        if (!saved) return;
        invoke('timer_action', { action }).then((session) => {
            this.timerSession = session;
            this.error = '';
            this.updatePreview();
        }).catch((error) => { this.error = `Could not control timer: ${error}`; });
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
        if (this.isCheckingUpdate) return;
        this.isCheckingUpdate = true;
        if (manual) {
            this.updateStatusText = 'Checking GitHub Releases…';
        }
        try {
            const res = await fetch('https://api.github.com/repos/tbkmax/TopClock/releases/latest', {
                headers: { 'Accept': 'application/vnd.github.v3+json' },
            });
            if (!res.ok) {
                if (res.status === 404) {
                    this.updateAvailable = false;
                    this.updateStatusText = `TopClock v${this.appVersion} is up to date`;
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const latestTag = data.tag_name || '';
            const cleanLatest = latestTag.replace(/^v/, '');
            this.latestReleaseUrl = data.html_url || 'https://github.com/tbkmax/TopClock/releases/latest';
            this.latestReleaseTag = latestTag;

            if (isNewerVersion(cleanLatest, this.appVersion)) {
                this.updateAvailable = true;
                this.updateStatusText = `New version ${latestTag} is available!`;
            } else {
                this.updateAvailable = false;
                this.updateStatusText = `TopClock v${this.appVersion} is up to date`;
            }
        } catch (error) {
            console.warn('Update check failed:', error);
            if (manual) {
                this.updateStatusText = `Could not reach GitHub Releases (v${this.appVersion})`;
            }
        } finally {
            this.isCheckingUpdate = false;
        }
    },

    openRelease() {
        invoke('open_release_page', { url: this.latestReleaseUrl }).catch(console.error);
    },

    startRecording(actionKey) {
        if (this.settings.shortcuts[`${actionKey}_enabled`]) {
            this.error = 'Turn off this shortcut before changing its keys.';
            return;
        }
        if (this.recordingAction) {
            this.stopRecording();
        }
        this.recordingAction = actionKey;
        this.recordListener = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === 'Escape') {
                this.stopRecording();
                return;
            }
            if (event.key === 'Backspace' || event.key === 'Delete') {
                this.clearShortcut(actionKey);
                this.stopRecording();
                return;
            }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
                return;
            }
            const mods = [];
            if (event.ctrlKey) mods.push('Ctrl');
            if (event.altKey) mods.push('Alt');
            if (event.shiftKey) mods.push('Shift');

            let key = event.key;
            if (key === ' ') key = 'Space';
            else if (key.length === 1) key = key.toUpperCase();

            if (!(event.ctrlKey || event.altKey || event.shiftKey) || !supportedGlobalKey(key)) {
                this.error = 'Choose Ctrl, Alt, or Shift plus a supported key for a system-wide shortcut.';
                return;
            }

            const combo = [...mods, key].join('+');
            if (!this.settings.shortcuts) {
                this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
            }
            this.settings.shortcuts[actionKey] = combo;
            this.error = '';
            this.save();
            this.stopRecording();
        };
        window.addEventListener('keydown', this.recordListener, { capture: true });
    },

    stopRecording() {
        if (this.recordListener) {
            window.removeEventListener('keydown', this.recordListener, { capture: true });
            this.recordListener = null;
        }
        this.recordingAction = null;
    },

    clearShortcut(actionKey) {
        if (!this.settings.shortcuts) {
            this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
        }
        this.settings.shortcuts[actionKey] = '';
        this.settings.shortcuts[`${actionKey}_enabled`] = false;
        this.save();
    },

    toggleShortcut(actionKey) {
        if (!this.settings.shortcuts[actionKey]) return;
        const key = `${actionKey}_enabled`;
        this.settings.shortcuts[key] = !this.settings.shortcuts[key];
        this.save();
    },

    resetAllShortcuts() {
        this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
        this.save();
    },

    getConflict(actionKey) {
        if (!this.settings?.shortcuts) return null;
        if (!this.timerAddonEnabled && actionKey.startsWith('timer_')) return null;
        if (!this.settings.shortcuts[`${actionKey}_enabled`]) return null;
        const current = (this.settings.shortcuts[actionKey] || '').trim().toLowerCase();
        if (!current) return null;

        const labels = {
            open_settings: 'Open Settings',
            quit: 'Quit TopClock',
            ...(this.timerAddonEnabled ? { timer_toggle: 'Timer Start / Stop', timer_reset: 'Timer Reset' } : {}),
        };

        for (const [key, label] of Object.entries(labels)) {
            if (key === actionKey) continue;
            if (!this.settings.shortcuts[`${key}_enabled`]) continue;
            const other = (this.settings.shortcuts[key] || '').trim().toLowerCase();
            if (other && other === current) {
                return label;
            }
        }
        return null;
    },

    get hasAnyConflict() {
        return Boolean(
            this.getConflict('open_settings') ||
            this.getConflict('quit') ||
            this.getConflict('timer_toggle') ||
            this.getConflict('timer_reset')
        );
    },

    formatShortcutKeys(binding) {
        if (!binding || !binding.trim()) return ['None'];
        return binding.split('+').map((k) => k.trim());
    },

    startDrag(event) {
        if (event.button === 0 && !event.target.closest('button')) {
            settingsWindow.startDragging().catch(console.error);
        }
    },

    async close() {
        this.stopRecording();
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

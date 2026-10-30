import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { clockFontStack, timeLayouts, timeParts } from './time-format.js';
import { colonAnimations, markChangedNumbers, numberAnimations } from './clock-animations.js';
import { addonCatalog, addonName, availableTimeZones, displayAddon } from './addons.js';
import { languageOptions, localizeDocument, resolveLanguage, translate } from './i18n.js';
import { addonMethods } from './settings-addons.js';
import { DEFAULT_SHORTCUTS, shortcutGroups, shortcutMethods } from './settings-shortcuts.js';
import { updateMethods } from './settings-updates.js';
import { createSettingsPersistence } from './settings-persistence.js';
import { nextSettingsTab } from './settings-tabs.js';
import './settings.css';
import './progress.css';

const settingsWindow = getCurrentWindow();
window.Alpine = Alpine;

Alpine.data('settingsApp', () => ({
    tab: 'clock',
    systemLocale: 'en',
    language: 'en',
    languageOptions,
    settings: {
        language: 'system',
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
    isPackaged: true,
    displays: [],
    resettingPositions: false,
    appVersion: '0.0.0',
    updateStatusKey: 'updates.currentVersion',
    updateStatusVars: { version: '0.0.0' },
    isCheckingUpdate: false,
    isInstallingUpdate: false,
    updateAvailable: false,
    latestReleaseUrl: 'https://github.com/tbkmax/TopClock/releases/latest',
    latestReleaseTag: '',
    previewParts: [],
    previewAddons: [],
    timerSession: null,
    pendingTimerChange: null,
    suppressResetPrompt: false,
    addonCatalog,
    addonName,
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
    saveController: null,
    shortcutGroups,

    async init() {
        this.systemLocale = await invoke('get_system_locale').catch(() => navigator.language || 'en');
        this.settings = await invoke('get_settings');
        this.syncLanguage();
        this.saveController = createSettingsPersistence({
            write: (settings) => invoke('update_settings', { settings }),
            preview: (settings) => emit('clock-settings-preview', settings),
            onCommit: () => { this.error = ''; },
            recover: async (fallback) => {
                try {
                    return await invoke('get_settings');
                } catch (error) {
                    console.error('Could not reload settings after failed save:', error);
                    return fallback;
                }
            },
            onRollback: async (settings, isCurrent) => {
                let timerSession = this.timerSession;
                try {
                    timerSession = await invoke('get_timer_state');
                } catch (error) {
                    console.error('Could not reload timer after failed save:', error);
                }
                if (!isCurrent()) return;
                this.settings = settings;
                this.syncLanguage();
                this.timerSession = timerSession;
                this.updatePreview();
            },
            onError: (error) => { this.error = this.t('error.save', { error }); },
        });
        this.saveController.setCommitted(this.settings);
        this.timerSession = await invoke('get_timer_state');
        this.hotkeyErrors = await invoke('get_hotkey_errors');
        this.appVersion = await getVersion().catch(() => '0.0.0');
        this.isPackaged = await invoke('is_packaged').catch((error) => {
            console.error('Could not determine package identity:', error);
            return true;
        });
        this.setUpdateStatus(this.isPackaged ? 'updates.store' : 'updates.currentVersion', { version: this.appVersion });
        await this.loadFontFamilies();
        await this.refreshStartupState();
        try {
            this.displays = await invoke('get_displays');
        } catch (error) {
            this.error = this.t('error.displays', { error });
        }
        this.updatePreview();
        setInterval(() => this.updatePreview(), 200);
        await listen('clock-settings-changed', (event) => {
            if (!this.saveController.hasPending()) {
                this.settings = event.payload;
                this.syncLanguage();
                this.saveController.setCommitted(event.payload);
                this.updatePreview();
            }
        });
        await listen('timer-state-changed', (event) => {
            this.timerSession = event.payload;
            this.updatePreview();
        });
        await listen('hotkey-errors-changed', (event) => { this.hotkeyErrors = event.payload; });
        await listen('displays-changed', (event) => { this.displays = event.payload; });
        await settingsWindow.onCloseRequested((event) => {
            event.preventDefault();
            this.close();
        });
        await settingsWindow.onFocusChanged(({ payload: focused }) => {
            if (focused) this.refreshStartupState();
        });
        if (!this.isPackaged && this.settings.auto_check_updates) {
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
            .map((addon) => displayAddon(addon, now, this.settings, this.timerSession, this.language))
            .filter((addon) => !addon.hidden);
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
            this.error = this.t('error.fonts', { error });
        } finally {
            this.fontsLoading = false;
        }
    },

    save() {
        this.syncLanguage();
        this.updatePreview();
        this.saveController.schedule(this.settings);
    },

    syncLanguage() {
        this.language = resolveLanguage(this.settings.language, this.systemLocale);
        document.documentElement.lang = this.language;
        localizeDocument(this.language);
    },

    t(key, vars) { return translate(this.language, key, vars); },

    setUpdateStatus(key, vars = {}) {
        this.updateStatusKey = key;
        this.updateStatusVars = vars;
    },

    get updateStatusText() { return this.t(this.updateStatusKey, this.updateStatusVars); },

    localizedAddonName(addon) {
        if (addon.kind === 'progress') {
            const count = this.settings.addons.filter((item) => item.kind === 'progress').findIndex((item) => item.id === addon.id) + 1;
            return this.t('addons.progressInstance', { count });
        }
        return addon.kind === 'region_clock' ? addonName(addon) : this.t(`addons.${addon.kind}`);
    },

    shortcutActionKey(key) {
        return { open_settings: 'openSettings', quit: 'quit', timer_toggle: 'timerToggle', timer_reset: 'timerReset' }[key];
    },

    shortcutEnableKey(key) {
        const action = this.shortcutActionKey(key);
        return `shortcuts.enable${action[0].toUpperCase()}${action.slice(1)}`;
    },

    getConflictLabel(actionKey) {
        const label = this.getConflict(actionKey);
        const keys = {
            'Open Settings': 'shortcuts.openSettings',
            'Quit TopClock': 'shortcuts.quit',
            'Timer Start / Stop': 'shortcuts.timerToggle',
            'Timer Reset': 'shortcuts.timerReset',
        };
        return label ? this.t(keys[label]) : null;
    },

    hotkeyErrors: [],

    ...addonMethods,
    ...updateMethods,
    ...shortcutMethods,

    selectTab(nextTab, focus = false) {
        this.stopRecording();
        this.tab = nextTab;
        if (focus) this.$nextTick(() => document.getElementById(`tab-${nextTab}`)?.focus());
    },

    onTabKeydown(event) {
        const next = nextSettingsTab(event.target.id?.replace('tab-', ''), event.key);
        if (!next) return;
        event.preventDefault();
        this.selectTab(next, true);
    },

    get timerAddonEnabled() {
        return (this.settings.addons || []).some((addon) => addon.kind === 'timer' && addon.enabled);
    },

    get hasAnyConflict() {
        return Boolean(
            this.getConflict('open_settings') ||
            this.getConflict('quit') ||
            this.getConflict('timer_toggle') ||
            this.getConflict('timer_reset')
        );
    },

    async refreshStartupState() {
        try {
            this.startupEnabled = await invoke('get_startup_enabled');
        } catch (error) {
            this.startupEnabled = false;
            this.error = this.t('error.startupRead', { error });
        }
    },

    async toggleStartup() {
        try {
            const enabled = !(await invoke('get_startup_enabled'));
            await invoke('set_startup_enabled', { enabled });
            this.error = '';
            await this.refreshStartupState();
        } catch (error) {
            this.startupEnabled = await invoke('get_startup_enabled').catch(() => false);
            this.error = this.t('error.startupUpdate', { error });
        }
    },

    async openSettingsFolder() {
        try {
            await invoke('open_settings_folder');
            this.error = '';
        } catch (error) {
            this.error = this.t('error.openFolder', { error });
        }
    },

    async resetClockPositions() {
        if (this.resettingPositions) return;
        this.resettingPositions = true;
        try {
            await invoke('reset_clock_positions');
            this.error = '';
        } catch (error) {
            this.error = this.t('error.resetPositions', { error });
        } finally {
            this.resettingPositions = false;
        }
    },

    displayLabel(display) {
        const rawName = typeof display.name === 'string' ? display.name : '';
        const devicePrefix = '\\\\.\\';
        const name = (rawName.startsWith(devicePrefix) ? rawName.slice(devicePrefix.length) : rawName).trim();
        const match = /^DISPLAY(\d+)/i.exec(name);
        return match ? this.t('general.displayNumber', { number: match[1] }) : name || this.t('general.display');
    },

    async toggleDisplay(display) {
        try {
            await invoke('set_display_enabled', { id: display.id, enabled: !display.enabled });
            this.displays = await invoke('get_displays');
            this.error = '';
        } catch (error) {
            this.error = this.t('error.displayVisibility', { error });
        }
    },

    startDrag(event) {
        if (event.button === 0 && !event.target.closest('button')) {
            settingsWindow.startDragging().catch(console.error);
        }
    },

    async close() {
        this.stopRecording();
        if (this.saveController && !await this.saveController.flush()) return;
        invoke('hide_settings').catch(console.error);
    },
    minimize() { invoke('minimize_settings').catch(console.error); },
}));

Alpine.start();

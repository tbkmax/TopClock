import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { timeLayouts } from '../time-format.js';
import { colonAnimations, numberAnimations } from '../clock-animations.js';
import { addonCatalog, addonName, availableTimeZones } from '../addons/model.js';
import { getAddonDefinition } from '../addons/registry.js';
import { createAddonHost } from '../addons/host.js';
import { DEFAULT_HALO_INTENSITY_PERCENT, haloIntensityPercent } from '../addons/builtins/signed-balance-appearance.js';
import { createTimeZoneOptions, regionZonePicker } from '../addons/builtins/region-picker.js';
import { languageOptions, localizeDocument, resolveLanguage, translate } from '../i18n/index.js';
import { addonMethods } from '../addons/instance-editor.js';
import { DEFAULT_SHORTCUTS, shortcutGroups, shortcutMethods } from './settings-shortcuts.js';
import { updateMethods } from './settings-updates.js';
import { createSettingsPersistence } from './settings-persistence.js';
import { nextSettingsTab } from './settings-tabs.js';
import { createSettingsPreview, createPreviewMethods } from './settings-preview.js';
import { subscribeSettingsEvents } from './settings-events.js';
import { readAddonSessions } from './settings-recovery.js';
import './settings.css';
import '../text-glow.css';
import '../addons/builtins/progress.css';

const settingsWindow = getCurrentWindow();
const timeZones = availableTimeZones();
let previewClock;
window.Alpine = Alpine;

Alpine.data('regionZonePicker', regionZonePicker);
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
        palette_enabled: false,
        shortcuts: { ...DEFAULT_SHORTCUTS },
        addons: [],
        addon_pairs: [],
        counter_halo_intensity_percent: DEFAULT_HALO_INTENSITY_PERCENT,
        timer_reset_warning_dismissed: false,
        timer_countdown_presets: [10, 30, 60],
        timer_preset_warning_dismissed: false,
        progress_countdown_presets: [10, 30, 60],
        progress_preset_warning_dismissed: false,
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
    addonHost: null,
    get timerSession() { return this.addonHost?.snapshot.timerSession ?? null; },
    get progressTimerSessions() { return this.addonHost?.snapshot.progressTimerSessions ?? {}; },
    get counterSession() { return this.addonHost?.snapshot.counterSession ?? null; },
    pendingCounterReset: false,
    progressPreviousPercent: {},
    progressCompletionUntil: {},
    pendingTimerChange: null,
    suppressResetPrompt: false,
    activeAddonDetailsKind: null,
    presetInput: '',
    draggedAddonId: null,
    addonPointer: null,
    addonDragOffsetY: 0,
    addonDragOffsetX: 0,
    addonDropTarget: null,
    dragWholePair: false,
    addonCatalog,
    addonName,
    timeZones,
    timeZoneOptions: createTimeZoneOptions(timeZones),
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
    disposeEvents: null,
    shortcutGroups,

    async init() {
        previewClock = createSettingsPreview(settingsWindow, () => this.updatePreview());
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
                const { timerSession, progressTimerSessions, counterSession } = await readAddonSessions(invoke, {
                    timerSession: this.timerSession,
                    progressTimerSessions: this.progressTimerSessions,
                    counterSession: this.counterSession,
                });
                if (!isCurrent()) return;
                this.settings = settings;
                this.syncLanguage();
                this.addonHost.setTimer(timerSession);
                this.addonHost.setProgress(progressTimerSessions);
                this.addonHost.setCounter(counterSession);
                this.updatePreview();
            },
            onError: (error) => { this.error = this.t('error.save', { error }); },
        });
        this.saveController.setCommitted(this.settings);
        this.addonHost = createAddonHost({
            reactive: Alpine.reactive,
            getSettings: () => this.settings,
            onChange: () => this.updatePreview(),
            beforeAction: () => this.saveController.flush(),
        });
        await this.addonHost.start();
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
        this.disposeEvents = await subscribeSettingsEvents({
            listen, settingsWindow,
            onSettingsChanged: (settings) => {
                if (!this.saveController.hasPending()) {
                    this.settings = settings;
                    this.syncLanguage();
                    this.saveController.setCommitted(settings);
                    this.updatePreview();
                }
            },
            onHotkeyErrorsChanged: (errors) => { this.hotkeyErrors = errors; },
            onDisplaysChanged: (displays) => { this.displays = displays; },
            onPaletteClose: () => this.close(),
            onClose: () => this.close(),
            onFocus: (focused) => {
                if (focused) this.refreshStartupState();
                this.syncPreviewTimer();
            },
            onResize: () => this.syncPreviewTimer(),
        });
        await this.syncPreviewTimer();
        if (!this.isPackaged && this.settings.auto_check_updates) {
            this.checkForUpdates(false);
        }
    },

    destroy() {
        this.disposeEvents?.();
        this.addonHost?.dispose();
        this.stopRecording();
    },

    addonActions(addon, role = 'settings-button') {
        return this.addonHost?.actionsFor(addon, role) || [];
    },
    async runAddonAction(addon, action) {
        try {
            const result = await this.addonHost.dispatch(addon.id, action.id, 'settings-button');
            if (result) this.error = '';
        } catch (error) {
            const key = addon.kind === 'progress' ? 'error.progressTimer'
                : addon.kind === 'counter' ? 'error.counter' : 'error.timer';
            this.error = this.t(key, { error });
        }
    },
    requestCounterReset() { this.pendingCounterReset = true; },
    async confirmCounterReset() {
        const counter = this.settings.addons.find((addon) => addon.kind === 'counter');
        if (!counter) { this.pendingCounterReset = false; return; }
        try {
            await this.addonHost.dispatch(counter.id, 'reset', 'counter-reset', { confirmedReset: true });
            this.error = '';
            this.pendingCounterReset = false;
        } catch (error) { this.error = String(error); }
    },
    addonDescription(addon) {
        return getAddonDefinition(addon.kind)?.describe(addon, {
            t: (key, vars) => this.t(key, vars), settings: this.settings,
        }).subtitle || '';
    },
    editAddonOption(addon, field, value) {
        if (getAddonDefinition(addon.kind)?.editor.setOption?.(addon, field, value)) this.save();
    },
    addonHasDetails(kind) { return Boolean(getAddonDefinition(kind)?.detailsViewKey); },
    openAddonDetails(kind) {
        const definition = getAddonDefinition(kind);
        if (!definition?.detailsViewKey) return;
        definition.detailsInit?.(this);
        this.activeAddonDetailsKind = kind;
        this.$nextTick(() => this.$refs.addonDetails?.querySelector('[data-detail-initial-focus]')?.focus());
    },
    closeAddonDetails() { this.activeAddonDetailsKind = null; },

    ...createPreviewMethods(() => previewClock),
    counterHaloIntensity() { return haloIntensityPercent(this.settings.counter_halo_intensity_percent); },
    setCounterHaloIntensity(value) {
        if (!Number.isInteger(value) || value < 0 || value > 100) return;
        this.settings.counter_halo_intensity_percent = value;
        this.save();
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
        const language = resolveLanguage(this.settings.language, this.systemLocale);
        if (this.language !== language) this.timeZoneOptions = createTimeZoneOptions(this.timeZones, language);
        this.language = language;
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
        return getAddonDefinition(addon.kind)?.describe(addon, {
            t: (key, vars) => this.t(key, vars), settings: this.settings,
        }).name
            || addonName(addon);
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

    setInteractionModifier(value) {
        if (this.settings.palette_enabled && value === this.settings.shortcuts.palette_key) {
            this.error = this.t('palette.keyConflict');
            return;
        }
        this.settings.shortcuts.interaction_modifier = value;
        this.error = '';
        this.save();
    },
    setPaletteKey(value) {
        if (this.settings.palette_enabled && value === this.settings.shortcuts.interaction_modifier) {
            this.error = this.t('palette.keyConflict');
            return;
        }
        this.settings.shortcuts.palette_key = value;
        if (!value) this.settings.palette_enabled = false;
        this.error = '';
        this.save();
    },
    togglePalette() {
        if (!this.settings.palette_enabled && (!this.settings.shortcuts.palette_key
            || this.settings.shortcuts.palette_key === this.settings.shortcuts.interaction_modifier)) {
            this.error = this.t('palette.keyConflict');
            this.selectTab('shortcuts');
            return;
        }
        this.settings.palette_enabled = !this.settings.palette_enabled;
        this.error = '';
        this.save();
    },

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
        await invoke('hide_settings').then(() => this.syncPreviewTimer()).catch(console.error);
    },
    minimize() { return invoke('minimize_settings').then(() => this.syncPreviewTimer()).catch(console.error); },
}));

Alpine.start();

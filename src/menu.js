import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { createAddonHost } from './addons/host.js';
import { localizeDocument, resolveLanguage, translate } from './i18n.js';
import './menu.css';

window.Alpine = Alpine;

Alpine.data('clockMenu', () => ({
    request: null,
    settings: null,
    systemLocale: 'en',
    language: 'en',
    addonHost: null,
    expandedId: null,
    revealPendingId: null,
    pendingChoice: null,
    dontShowAgain: false,
    busy: false,
    error: '',
    resizeTimer: null,
    resizeRevision: 0,
    resizing: false,
    get menuEntries() { return this.addonHost?.menuEntries((key, vars) => this.t(key, vars)) || []; },
    get toggleEntries() { return this.addonHost?.toggleEntries((key, vars) => this.t(key, vars)) || []; },
    t(key, vars) { return key ? translate(this.language, key, vars) : ''; },

    async init() {
        this.addonHost = createAddonHost({
            reactive: Alpine.reactive,
            getSettings: () => this.settings,
            onChange: () => this.resizeMenu(),
        });
        this.$nextTick(() => new ResizeObserver(() => this.resizeMenu()).observe(this.$refs.surface));
        await Promise.all([
            listen('clock-menu-open', ({ payload }) => this.open(payload)),
            listen('dismiss-menu', () => this.close()),
            listen('clock-settings-changed', ({ payload }) => this.applySettings(payload)),
            listen('clock-settings-preview', ({ payload }) => this.applySettings(payload)),
        ]);
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.close(); });
        this.systemLocale = await invoke('get_system_locale').catch(() => navigator.language || 'en');
        await this.loadSettings();
        await this.addonHost.start().catch(console.error);
        const request = await invoke('get_clock_menu_request');
        if (request) this.open(request);
    },
    destroy() { clearTimeout(this.resizeTimer); this.addonHost?.dispose(); },
    async loadSettings() {
        try { this.applySettings(await invoke('get_settings')); }
        catch (error) { this.error = String(error); }
    },
    applySettings(settings) {
        this.settings = settings;
        this.language = resolveLanguage(settings?.language || 'system', this.systemLocale);
        document.documentElement.lang = this.language;
        localizeDocument(this.language);
        this.resizeMenu();
    },
    async open(request) {
        this.request = request;
        this.expandedId = null;
        this.revealPendingId = null;
        this.pendingChoice = null;
        this.error = '';
        if (!this.settings) await this.loadSettings();
        this.resizeMenu();
    },
    resizeMenu() {
        if (!this.request) return;
        const revision = ++this.resizeRevision;
        this.resizing = true;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(async () => {
            if (!this.request || !this.$refs.surface) return;
            const id = this.request.id;
            // Measure the surface, not the viewport, so compact menus can grow again
            // when an add-on or a longer localized label appears.
            const width = Math.ceil(this.$refs.surface.offsetWidth) + 12;
            const height = Math.ceil(this.$refs.surface.offsetHeight) + 12;
            try { await invoke('show_clock_menu', { requestId: id, width, height }); }
            catch (error) { if (this.request?.id === id) this.error = String(error); }
            finally {
                if (this.request?.id === id && this.resizeRevision === revision) {
                    this.resizing = false;
                    this.revealPendingId = null;
                }
            }
        }, 20);
    },
    toggleChoices(id) {
        const opening = this.expandedId !== id;
        this.resizing = true;
        this.revealPendingId = opening ? id : null;
        this.expandedId = opening ? id : null;
        this.$nextTick(() => this.resizeMenu());
    },
    async close() {
        if (!this.request) return;
        const id = this.request.id;
        this.request = null;
        this.resizeRevision++;
        this.resizing = false;
        this.revealPendingId = null;
        clearTimeout(this.resizeTimer);
        try { await invoke('close_clock_menu', { requestId: id }); }
        catch (error) { console.error(error); }
    },
    async runAction(entry) {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        try {
            await this.addonHost.dispatch(entry.instanceId, entry.action.id, 'clock-menu');
            await this.close();
        } catch (error) { this.error = String(error); }
        finally { this.busy = false; }
    },
    async toggleAddon(entry) {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        try {
            const saved = await this.addonHost.setEnabled(entry.id, !entry.enabled);
            if (saved) this.applySettings(saved);
        } catch (error) { this.error = String(error); }
        finally { this.busy = false; }
    },
    choose(entry, choice) {
        if (this.busy) return;
        if (choice.confirm?.required) {
            this.resizing = true;
            this.pendingChoice = { entry, choice };
            this.dontShowAgain = false;
            this.$nextTick(() => this.resizeMenu());
            return;
        }
        this.applyChoice(entry, choice, false);
    },
    confirmChoice() {
        if (!this.pendingChoice) return;
        const { entry, choice } = this.pendingChoice;
        this.applyChoice(entry, choice, true);
    },
    async applyChoice(entry, choice, confirmedReset) {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        try {
            await this.addonHost.dispatchMenuChoice(entry.instanceId, choice.id, {
                confirmedReset, dontShowAgain: confirmedReset && this.dontShowAgain,
            });
            this.resizing = true;
            this.pendingChoice = null;
            this.$nextTick(() => this.resizeMenu());
        } catch (error) {
            if (String(error).includes('requires confirmation') && choice.confirm) {
                this.resizing = true;
                this.pendingChoice = { entry, choice };
                this.dontShowAgain = false;
                this.$nextTick(() => this.resizeMenu());
            } else this.error = String(error);
        } finally { this.busy = false; }
    },
    async openSettings() { await this.close(); invoke('open_settings').catch(console.error); },
    quitApp() { invoke('quit').catch((error) => { this.error = String(error); }); },
}));

Alpine.start();

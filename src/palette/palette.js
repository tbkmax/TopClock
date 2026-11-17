import Alpine from 'alpinejs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createAddonHost } from '../addons/host.js';
import { localizeDocument, resolveLanguage, translate } from '../i18n.js';
import { fitSectorLabel, pageNodes, paletteTree, PALETTE_RADII, ringAndIndex, sectorLabel, sectorPath } from './palette-model.js';
import './palette.css';

const paletteWindow = getCurrentWindow();
const labelContext = document.createElement('canvas').getContext('2d');
const labelWidths = new Map();
function measureLabel(label) {
    if (!labelWidths.has(label)) {
        if (labelWidths.size >= 64) labelWidths.clear();
        if (labelContext) labelContext.font = '600 14px "Segoe UI", sans-serif';
        labelWidths.set(label, labelContext?.measureText(label).width || Array.from(label).length * 8);
    }
    return labelWidths.get(label);
}
window.Alpine = Alpine;

Alpine.data('mousePalette', () => ({
    open: false,
    pointer: null,
    settings: null,
    systemLocale: 'en',
    language: 'en',
    addonHost: null,
    page: 0,
    rootId: null,
    secondId: null,
    selectedNode: null,
    canNavigate: true,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    error: '',
    sequence: 0,
    get tree() {
        return paletteTree(this.addonHost?.menuEntries((key, vars) => this.t(key, vars)) || [],
            this.addonHost?.toggleEntries((key, vars) => this.t(key, vars)) || [],
            (key, vars) => this.t(key, vars));
    },
    get rootNodes() { return pageNodes(this.tree, this.page, (key) => this.t(key)); },
    get rootNode() { return this.rootNodes.find((node) => node.id === this.rootId); },
    get secondNode() { return this.rootNode?.children?.find((node) => node.id === this.secondId); },
    get rings() {
        if (!this.pointer) return [];
        const lists = [this.rootNodes, this.rootNode?.children, this.secondNode?.children];
        return lists.flatMap((nodes, depth) => !nodes?.length ? [] : [{
            depth,
            items: nodes.map((node, index) => {
                const { x, y } = sectorLabel(this.pointer.center_x, this.pointer.center_y,
                    PALETTE_RADII[depth], PALETTE_RADII[depth + 1], index, nodes.length);
                const fitted = fitSectorLabel(node.label, PALETTE_RADII[depth], PALETTE_RADII[depth + 1],
                    nodes.length, measureLabel);
                return { node, x, y, label: fitted.text, fontSize: fitted.fontSize,
                    path: sectorPath(this.pointer.center_x, this.pointer.center_y,
                        PALETTE_RADII[depth], PALETTE_RADII[depth + 1], index, nodes.length),
                    selected: this.selectedNode?.id === node.id || (depth === 0 && this.rootId === node.id)
                        || (depth === 1 && this.secondId === node.id) };
            }),
        }]);
    },
    renderPalette() {
        const svg = this.$refs.svg;
        if (!svg) return;
        svg.replaceChildren();
        if (!this.pointer) return;
        const ns = 'http://www.w3.org/2000/svg';
        const element = (name, attributes, value) => {
            const node = document.createElementNS(ns, name);
            for (const [key, entry] of Object.entries(attributes)) node.setAttribute(key, String(entry));
            if (value !== undefined) node.textContent = value;
            return node;
        };
        for (const ring of this.rings) {
            for (const item of ring.items) {
                const group = element('g', { class: `${item.selected ? 'selected ' : ''}${item.node.disabled ? 'disabled' : ''}` });
                group.append(element('path', { d: item.path, class: 'palette-sector' }),
                    element('text', { x: item.x, y: item.y, style: `font-size: ${item.fontSize}px`,
                        'text-anchor': 'middle', 'dominant-baseline': 'middle' }, item.label));
                svg.append(group);
            }
        }
        svg.append(element('circle', { cx: this.pointer.center_x, cy: this.pointer.center_y, r: 54, class: 'palette-center' }),
            element('text', { x: this.pointer.center_x, y: this.pointer.center_y, 'text-anchor': 'middle',
                'dominant-baseline': 'middle', class: 'palette-hint' }, this.t('palette.cancel')));
    },
    t(key, vars) { return translate(this.language, key, vars); },
    async init() {
        this.addonHost = createAddonHost({ reactive: Alpine.reactive, getSettings: () => this.settings });
        await Promise.all([
            listen('palette-open', ({ payload }) => this.openAt(payload)),
            listen('palette-move', ({ payload }) => this.moveTo(payload)),
            listen('palette-release', ({ payload }) => this.releaseAt(payload)),
            listen('palette-cancel', () => { this.open = false; }),
            listen('clock-settings-changed', ({ payload }) => this.applySettings(payload)),
        ]);
        window.addEventListener('resize', () => {
            this.viewportWidth = window.innerWidth;
            this.viewportHeight = window.innerHeight;
        });
        this.systemLocale = await invoke('get_system_locale').catch(() => navigator.language || 'en');
        this.applySettings(await invoke('get_settings'));
        await this.addonHost.start();
    },
    destroy() { this.addonHost?.dispose(); },
    applySettings(settings) {
        this.settings = settings;
        this.language = resolveLanguage(settings?.language || 'system', this.systemLocale);
        document.documentElement.lang = this.language;
        localizeDocument(this.language);
    },
    async openAt(pointer) {
        const sequence = ++this.sequence;
        this.pointer = pointer;
        this.page = 0;
        this.rootId = null;
        this.secondId = null;
        this.selectedNode = null;
        this.canNavigate = true;
        this.error = '';
        this.open = true;
        try {
            const settings = await invoke('get_settings');
            if (this.sequence === sequence) this.applySettings(settings);
        }
        catch (error) { this.error = String(error); }
    },
    moveTo(pointer) {
        if (!this.open) return;
        this.pointer = pointer;
        const distance = Math.hypot(pointer.x - pointer.center_x, pointer.y - pointer.center_y);
        if (distance < PALETTE_RADII[0]) {
            this.rootId = null;
            this.secondId = null;
            this.selectedNode = null;
            this.canNavigate = true;
            return;
        }
        const root = ringAndIndex(pointer, this.rootNodes);
        if (!root) { this.selectedNode = null; return; }
        if (root.ring === 0) {
            if (!this.canNavigate) { this.selectedNode = null; return; }
            const node = this.rootNodes[root.index];
            if (node.page !== undefined) {
                if (this.canNavigate) {
                    this.page = node.page;
                    this.rootId = null;
                    this.secondId = null;
                    this.canNavigate = false;
                }
                this.selectedNode = null;
                return;
            }
            this.rootId = node.id;
            this.secondId = null;
            this.selectedNode = node.children?.length ? null : node;
            return;
        }
        if (root.ring === 1) {
            const children = this.rootNode?.children;
            const hit = ringAndIndex(pointer, children);
            const node = hit && children[hit.index];
            this.secondId = node?.id || null;
            this.selectedNode = node?.children?.length ? null : node || null;
            return;
        }
        const children = this.secondNode?.children;
        const hit = ringAndIndex(pointer, children);
        this.selectedNode = hit ? children[hit.index] : null;
    },
    async releaseAt(pointer) {
        if (!this.open) return;
        const sequence = this.sequence;
        this.moveTo(pointer);
        const operation = this.selectedNode?.disabled ? null : this.selectedNode?.operation;
        this.open = false;
        await paletteWindow.hide().catch(console.error);
        try {
            if (!operation) return;
            if (operation.type === 'settings') await invoke('toggle_palette_settings');
            else if (operation.type === 'quit') await invoke('quit');
            else if (operation.type === 'action') {
                await this.addonHost.dispatch(operation.instanceId, operation.actionId, 'clock-menu');
            } else if (operation.type === 'toggle') {
                await this.addonHost.setEnabled(operation.instanceId, operation.enabled);
            } else if (operation.type === 'choice') {
                const warning = operation.confirm;
                if (warning?.required) {
                    await invoke('open_palette_confirmation', {
                        instanceId: operation.instanceId, choiceId: operation.choiceId,
                    });
                } else {
                    await this.addonHost.dispatchMenuChoice(operation.instanceId, operation.choiceId);
                }
            }
        } catch (error) {
            this.error = String(error);
            console.error(error);
            if (this.sequence === sequence) {
                this.open = true;
                await invoke('show_palette_error').catch(console.error);
                await new Promise((resolve) => setTimeout(resolve, 1800));
            }
        } finally {
            if (this.sequence === sequence) {
                this.open = false;
                await paletteWindow.hide().catch(console.error);
            }
        }
    },
}));

Alpine.start();

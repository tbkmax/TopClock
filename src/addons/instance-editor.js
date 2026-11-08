import { createAddon } from './model.js';
import { getAddonDefinition } from './registry.js';
import { progressEditorMethods } from './builtins/progress.js';
import { timerEditorMethods } from './builtins/timer.js';

export function reorderAddons(addons, sourceId, targetId, placement, after = false) {
    const source = addons.find((addon) => addon.id === sourceId);
    const target = targetId ? addons.find((addon) => addon.id === targetId) : null;
    if (!source || targetId === sourceId || (targetId && !target)) return null;
    const nextPlacement = target?.placement ?? placement;
    if (!['above', 'below'].includes(nextPlacement)) return null;

    const remaining = addons.filter((addon) => addon.id !== sourceId);
    const above = remaining.filter((addon) => addon.placement === 'above');
    const below = remaining.filter((addon) => addon.placement === 'below');
    const group = nextPlacement === 'above' ? above : below;
    const moved = { ...source, placement: nextPlacement };
    if (target) {
        const index = group.findIndex((addon) => addon.id === targetId);
        group.splice(index + Number(after), 0, moved);
    } else if (nextPlacement === 'above') {
        group.push(moved);
    } else {
        group.unshift(moved);
    }
    const result = [...above, ...below];
    return result.every((addon, index) => addon.id === addons[index]?.id && addon.placement === addons[index]?.placement)
        ? null : result;
}

export const addonMethods = {
    hasAddon(kind) { return (this.settings.addons || []).some((addon) => addon.kind === kind); },
    canAddAddon(kind) {
        const definition = getAddonDefinition(kind);
        return Boolean(definition) && this.settings.addons.length < 16
            && this.settings.addons.filter((addon) => addon.kind === kind).length < definition.maxInstances;
    },

    addAddon(kind) {
        if (!this.canAddAddon(kind)) return;
        this.settings.addons.push(createAddon(kind));
        this.save();
    },

    removeAddon(id) {
        this.settings.addons = this.settings.addons.filter((addon) => addon.id !== id);
        this.save();
    },

    addonDashboardRows() {
        return [
            ...this.settings.addons.filter((addon) => addon.placement === 'above'),
            { id: '__clock__', kind: 'clock' },
            ...this.settings.addons.filter((addon) => addon.placement === 'below'),
        ];
    },

    startAddonPointer(event, id) {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        this.addonPointer = {
            id, pointerId: event.pointerId, startY: event.clientY,
            startScrollTop: document.getElementById('panel-addons').scrollTop,
        };
        this.addonDropTarget = null;
    },

    moveAddonPointer(event) {
        const pointer = this.addonPointer;
        if (!pointer || pointer.pointerId !== event.pointerId) return;
        const offset = event.clientY - pointer.startY;
        if (!this.draggedAddonId && Math.abs(offset) < 4) return;
        this.draggedAddonId = pointer.id;
        const panel = document.getElementById('panel-addons');
        const panelRect = panel.getBoundingClientRect();
        if (event.clientY < panelRect.top + 48) panel.scrollTop -= 14;
        else if (event.clientY > panelRect.bottom - 48) panel.scrollTop += 14;
        this.addonDragOffsetY = offset + panel.scrollTop - pointer.startScrollTop;

        const targets = [...panel.querySelectorAll('.addon-instance, .addon-clock-block')]
            .filter((element) => element.dataset.addonId !== pointer.id);
        let closest = null;
        let distance = Infinity;
        for (const element of targets) {
            const rect = element.getBoundingClientRect();
            const gap = event.clientY < rect.top ? rect.top - event.clientY
                : event.clientY > rect.bottom ? event.clientY - rect.bottom : 0;
            if (gap < distance) { closest = element; distance = gap; }
        }
        if (!closest) return;
        if (closest.classList.contains('addon-clock-block')) {
            const rect = closest.getBoundingClientRect();
            this.addonDropTarget = { placement: event.clientY < rect.top + rect.height / 2 ? 'above' : 'below' };
        } else {
            const head = closest.querySelector('.addon-instance-head').getBoundingClientRect();
            this.addonDropTarget = { id: closest.dataset.addonId, after: event.clientY >= head.top + head.height / 2 };
        }
    },

    finishAddonPointer(event) {
        const pointer = this.addonPointer;
        if (!pointer || pointer.pointerId !== event.pointerId) return;
        this.moveAddonPointer(event);
        const rect = document.getElementById('panel-addons').getBoundingClientRect();
        const insidePanel = event.clientX >= rect.left && event.clientX <= rect.right
            && event.clientY >= rect.top && event.clientY <= rect.bottom;
        const target = insidePanel ? this.addonDropTarget : null;
        const sourceId = this.draggedAddonId;
        this.endAddonDrag();
        if (!sourceId || !target) return;
        if (target.id) {
            const addon = this.settings.addons.find((item) => item.id === target.id);
            if (addon) this.applyAddonReorder(sourceId, target.id, addon.placement, target.after);
        } else {
            this.applyAddonReorder(sourceId, null, target.placement);
        }
        this.$nextTick(() => document.getElementById(`addon-card-${sourceId}`)?.querySelector('.addon-drag-handle')?.focus());
    },

    applyAddonReorder(sourceId, targetId, placement, after = false) {
        const next = reorderAddons(this.settings.addons, sourceId, targetId, placement, after);
        if (!next) return;
        this.settings.addons = next;
        this.save();
    },

    nudgeAddon(id, direction) {
        const rows = this.addonDashboardRows();
        const index = rows.findIndex((row) => row.id === id);
        const target = rows[index + direction];
        if (!target) return;
        if (target.kind === 'clock') this.applyAddonReorder(id, null, direction < 0 ? 'above' : 'below');
        else this.applyAddonReorder(id, target.id, target.placement, direction > 0);
        this.$nextTick(() => document.getElementById(`addon-card-${id}`)?.querySelector('.addon-drag-handle')?.focus());
    },

    endAddonDrag() {
        this.addonPointer = null;
        this.draggedAddonId = null;
        this.addonDragOffsetY = 0;
        this.addonDropTarget = null;
    },
    ...progressEditorMethods,
    ...timerEditorMethods,
};


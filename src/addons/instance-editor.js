import { createAddon } from './model.js';
import { addonLayout, canPair, combineAddons, moveAddonLayout, pairFor, swapPair } from './layout.js';
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
        this.settings.addon_pairs = (this.settings.addon_pairs || []).filter((pair) =>
            pair.left_id !== id && pair.right_id !== id);
        this.save();
    },

    addonDashboardRows() {
        const rows = addonLayout(this.settings.addons, this.settings.addon_pairs);
        return [
            ...rows.filter((row) => row.placement === 'above'),
            { id: '__clock__', kind: 'clock' },
            ...rows.filter((row) => row.placement === 'below'),
        ];
    },

    startAddonPointer(event, id, wholePair = false) {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        this.addonPointer = {
            id, pointerId: event.pointerId, startX: event.clientX ?? 0, startY: event.clientY,
            startScrollTop: document.getElementById('panel-addons').scrollTop,
        };
        this.dragWholePair = wholePair;
        this.addonDropTarget = null;
    },

    moveAddonPointer(event) {
        const pointer = this.addonPointer;
        if (!pointer || pointer.pointerId !== event.pointerId) return;
        const offsetX = (event.clientX ?? pointer.startX) - pointer.startX;
        const offsetY = event.clientY - pointer.startY;
        if (!this.draggedAddonId && Math.hypot(offsetX, offsetY) < 4) return;
        this.draggedAddonId = pointer.id;
        const panel = document.getElementById('panel-addons');
        const panelRect = panel.getBoundingClientRect();
        if (event.clientY < panelRect.top + 48) panel.scrollTop -= 14;
        else if (event.clientY > panelRect.bottom - 48) panel.scrollTop += 14;
        this.addonDragOffsetX = offsetX;
        this.addonDragOffsetY = offsetY + panel.scrollTop - pointer.startScrollTop;

        const sourcePair = pairFor(this.settings.addon_pairs || [], pointer.id);
        const targets = [...panel.querySelectorAll('.addon-member, .addon-instance, .addon-clock-block')]
            .filter((element) => element.classList.contains('addon-clock-block')
                || (element.dataset.addonId && element.dataset.addonId !== pointer.id
                    && !(this.dragWholePair && sourcePair
                        && [sourcePair.left_id, sourcePair.right_id].includes(element.dataset.addonId))));
        let closest = null;
        let distance = Infinity;
        for (const element of targets) {
            const rect = element.getBoundingClientRect();
            const yGap = event.clientY < rect.top ? rect.top - event.clientY
                : event.clientY > rect.bottom ? event.clientY - rect.bottom : 0;
            const xGap = event.clientX == null ? 0
                : event.clientX < (rect.left ?? panelRect.left) ? (rect.left ?? panelRect.left) - event.clientX
                    : event.clientX > (rect.right ?? panelRect.right) ? event.clientX - (rect.right ?? panelRect.right) : 0;
            const gap = Math.hypot(xGap, yGap);
            if (gap < distance) { closest = element; distance = gap; }
        }
        if (!closest || distance > 32) { this.addonDropTarget = null; return; }
        if (closest.classList.contains('addon-clock-block')) {
            const rect = closest.getBoundingClientRect();
            this.addonDropTarget = { placement: event.clientY < rect.top + rect.height / 2 ? 'above' : 'below' };
        } else {
            const head = closest.querySelector('.addon-instance-head').getBoundingClientRect();
            const id = closest.dataset.addonId;
            const samePair = sourcePair && pairFor(this.settings.addon_pairs || [], id) === sourcePair;
            const middle = event.clientY >= head.top + head.height * .25
                && event.clientY <= head.top + head.height * .75;
            this.addonDropTarget = { id, after: event.clientY >= head.top + head.height / 2 };
            if (!this.dragWholePair && !sourcePair && middle
                && canPair(this.settings.addons, this.settings.addon_pairs || [], pointer.id, id)) {
                this.addonDropTarget.combine = true;
                this.addonDropTarget.after = event.clientX == null || head.left == null
                    ? this.addonDropTarget.after : event.clientX >= head.left + head.width / 2;
            }
            if (!this.dragWholePair && samePair) this.addonDropTarget.swap = true;
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
        const wholePair = this.dragWholePair;
        const dragDistance = Math.hypot(this.addonDragOffsetX, this.addonDragOffsetY);
        this.endAddonDrag();
        if (!sourceId) return;
        if (!target) {
            if (insidePanel && !wholePair && dragDistance > 40) this.splitAddonPair(sourceId);
            return;
        }
        if (target.swap) this.swapAddonPair(sourceId);
        else if (target.combine) this.combineAddonPair(sourceId, target.id, target.after);
        else if (target.id) {
            const addon = this.settings.addons.find((item) => item.id === target.id);
            if (addon) this.applyAddonReorder(sourceId, target.id, addon.placement, target.after, wholePair);
        } else {
            this.applyAddonReorder(sourceId, null, target.placement, false, wholePair);
        }
        this.$nextTick(() => document.getElementById(`addon-card-${sourceId}`)?.querySelector('.addon-drag-handle')?.focus());
    },

    applyAddonReorder(sourceId, targetId, placement, after = false, wholePair = false) {
        const next = moveAddonLayout(this.settings.addons, this.settings.addon_pairs || [],
            sourceId, targetId, placement, after, wholePair);
        if (!next) return;
        this.settings.addons = next.addons;
        this.settings.addon_pairs = next.pairs;
        this.save();
    },

    combineAddonPair(sourceId, targetId, after = true) {
        const next = combineAddons(this.settings.addons, this.settings.addon_pairs || [], sourceId, targetId, after);
        if (!next) return;
        this.settings.addons = next.addons;
        this.settings.addon_pairs = next.pairs;
        this.save();
    },

    swapAddonPair(id) {
        const next = swapPair(this.settings.addons, this.settings.addon_pairs || [], id);
        if (!next) return;
        this.settings.addons = next.addons;
        this.settings.addon_pairs = next.pairs;
        this.save();
    },

    splitAddonPair(id) {
        const pair = pairFor(this.settings.addon_pairs || [], id);
        if (!pair) return;
        this.settings.addon_pairs = this.settings.addon_pairs.filter((item) => item.left_id !== pair.left_id);
        this.save();
    },

    toggleAddonPair(id) {
        const pair = pairFor(this.settings.addon_pairs || [], id);
        if (!pair) return;
        const left = this.settings.addons.find((addon) => addon.id === pair.left_id);
        const right = this.settings.addons.find((addon) => addon.id === pair.right_id);
        if (!left || !right) return;
        left.enabled = right.enabled = !left.enabled;
        this.save();
    },

    nudgeAddon(id, direction, wholePair = false) {
        const rows = this.addonDashboardRows();
        const index = rows.findIndex((row) => row.items?.some((addon) => addon.id === id));
        const target = rows[index + direction];
        if (!target) return;
        if (target.kind === 'clock') this.applyAddonReorder(id, null, direction < 0 ? 'above' : 'below', false, wholePair);
        else this.applyAddonReorder(id, target.items[0].id, target.placement, direction > 0, wholePair);
        this.$nextTick(() => document.getElementById(`addon-card-${id}`)?.querySelector('.addon-drag-handle')?.focus());
    },

    endAddonDrag() {
        this.addonPointer = null;
        this.draggedAddonId = null;
        this.addonDragOffsetX = 0;
        this.addonDragOffsetY = 0;
        this.addonDropTarget = null;
        this.dragWholePair = false;
    },
    ...progressEditorMethods,
    ...timerEditorMethods,
};


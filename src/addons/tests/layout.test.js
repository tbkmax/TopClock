import assert from 'node:assert/strict';
import test from 'node:test';
import { addonMethods, reorderAddons } from '../instance-editor.js';
import { addonLayout, canPair, combineAddons, displayLayout, moveAddonLayout, pairEnabled, swapPair } from '../layout.js';
import { counterDisplay } from '../builtins/counter.js';

test('drag ordering moves add-ons within a stack and across the clock', () => {
    const addons = [
        { id: 'a', placement: 'above' },
        { id: 'b', placement: 'above' },
        { id: 'c', placement: 'below' },
        { id: 'd', placement: 'below' },
    ];
    const within = reorderAddons(addons, 'a', 'b', 'above', true);
    assert.deepEqual(within.map((addon) => addon.id), ['b', 'a', 'c', 'd']);
    const across = reorderAddons(within, 'b', null, 'below');
    assert.deepEqual(across.map((addon) => [addon.id, addon.placement]), [
        ['a', 'above'], ['b', 'below'], ['c', 'below'], ['d', 'below'],
    ]);
    const lastAbove = reorderAddons(across, 'd', null, 'above');
    assert.deepEqual(lastAbove.map((addon) => addon.id), ['a', 'd', 'b', 'c']);
    assert.equal(reorderAddons(lastAbove, 'd', null, 'above'), null);
    assert.deepEqual(addons.map((addon) => addon.id), ['a', 'b', 'c', 'd']);
});

test('a pair retains both instance sizes and can swap, move, or split', () => {
    const timer = { id: 'timer', kind: 'timer', placement: 'below', enabled: true, size_percent: 60 };
    const date = { id: 'date', kind: 'date', placement: 'below', enabled: true, size_percent: 30 };
    const progress = { id: 'progress', kind: 'progress', placement: 'below', enabled: true, size_percent: 30 };
    assert.equal(canPair([timer, progress], [], 'timer', 'progress'), false);
    const combined = combineAddons([timer, date, progress], [], 'date', 'timer');
    assert.deepEqual(combined.addons.map((addon) => addon.id), ['timer', 'date', 'progress']);
    assert.deepEqual(combined.pairs, [{ left_id: 'timer', right_id: 'date', size_percent: 100 }]);
    combined.pairs[0].size_percent = 50;
    assert.deepEqual(displayLayout(combined.addons, combined.pairs)[0].items.map((addon) => addon.effective_size_percent), [30, 15]);
    const swapped = swapPair(combined.addons, combined.pairs, 'timer');
    assert.deepEqual(swapped.addons.map((addon) => addon.id), ['date', 'timer', 'progress']);
    assert.deepEqual(swapped.pairs[0], { left_id: 'date', right_id: 'timer', size_percent: 50 });
    const moved = moveAddonLayout(swapped.addons, swapped.pairs, 'date', null, 'above', false, true);
    assert.deepEqual(moved.addons.map((addon) => [addon.id, addon.placement]),
        [['date', 'above'], ['timer', 'above'], ['progress', 'below']]);
    assert.equal(addonLayout(moved.addons, moved.pairs)[0].items.length, 2);
    const split = moveAddonLayout(moved.addons, moved.pairs, 'timer', 'progress', 'below');
    assert.deepEqual(split.pairs, []);
    assert.deepEqual(split.addons.map((addon) => addon.id), ['date', 'timer', 'progress']);
    assert.equal(split.addons[1].size_percent, 60);
});

test('combining preserves member switches and a lone visible member keeps shared size', () => {
    const date = { id: 'date', kind: 'date', placement: 'below', enabled: false, size_percent: 40 };
    const timer = { id: 'timer', kind: 'timer', placement: 'below', enabled: true, size_percent: 60 };
    const combined = combineAddons([date, timer], [], 'date', 'timer');
    combined.pairs[0].size_percent = 50;
    assert.deepEqual(combined.addons.map((addon) => addon.enabled), [true, false]);
    for (const visibleId of ['date', 'timer']) {
        const visible = combined.addons.filter((addon) => addon.id === visibleId);
        const rows = displayLayout(visible, combined.pairs);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].items.length, 1);
        assert.equal(rows[0].items[0].effective_size_percent, visible[0].size_percent / 2);
    }
});

test('Counter pairs with eligible text add-ons in either position', () => {
    const counter = { id: 'counter', kind: 'counter', placement: 'below', enabled: true, size_percent: 30 };
    for (const kind of ['date', 'region_clock', 'timer']) {
        const other = { id: kind, kind, placement: 'below', enabled: true, size_percent: 40 };
        for (const [source, target] of [[counter, other], [other, counter]]) {
            assert.equal(canPair([source, target], [], source.id, target.id), true);
            const combined = combineAddons([source, target], [], source.id, target.id);
            assert.deepEqual(addonLayout(combined.addons, combined.pairs)[0].items.map((item) => item.id),
                [target.id, source.id]);
            const session = { value_ms: -3600000, running: true, direction: 1, started_at_ms: 0 };
            const rendered = displayLayout(combined.addons.map((addon) => addon.kind === 'counter'
                ? { ...addon, ...counterDisplay(session, 0) } : addon), combined.pairs)[0].items;
            assert.equal(rendered.find((addon) => addon.kind === 'counter').motion, 'up');
            assert.equal(rendered.find((addon) => addon.kind !== 'counter').motion, undefined);
        }
    }
    const progress = { id: 'progress', kind: 'progress', placement: 'below', enabled: true };
    assert.equal(canPair([counter, progress], [], 'counter', 'progress'), false);
});

test('combined switch and removal keep pair metadata consistent', () => {
    const addons = [
        { id: 'date', kind: 'date', placement: 'below', enabled: true },
        { id: 'region', kind: 'region_clock', placement: 'below', enabled: true },
    ];
    const app = {
        ...addonMethods,
        settings: { addons, addon_pairs: [{ left_id: 'date', right_id: 'region', size_percent: 100 }] },
        saves: 0, save() { this.saves++; },
    };
    app.toggleAddonPair('date');
    assert.deepEqual(app.settings.addons.map((addon) => addon.enabled), [false, false]);
    assert.equal(pairEnabled(app.settings.addons), false);
    app.settings.addons[0].enabled = true;
    assert.equal(pairEnabled(app.settings.addons), true);
    app.toggleAddonPair('date');
    assert.deepEqual(app.settings.addons.map((addon) => addon.enabled), [false, false]);
    app.toggleAddonPair('date');
    assert.deepEqual(app.settings.addons.map((addon) => addon.enabled), [true, true]);
    assert.equal(pairEnabled(app.settings.addons), true);
    app.toggleAddonPair('date');
    assert.deepEqual(app.settings.addons.map((addon) => addon.enabled), [false, false]);
    app.removeAddon('region');
    assert.deepEqual(app.settings.addon_pairs, []);
    assert.deepEqual(app.settings.addons.map((addon) => addon.id), ['date']);
    assert.equal(app.saves, 5);
});

test('pointer drag moves the card and commits its new placement on release', () => {
    const above = { id: 'a', placement: 'above' };
    const below = { id: 'b', placement: 'below' };
    const card = (id, top, bottom) => ({
        dataset: { addonId: id },
        getBoundingClientRect: () => ({ top, bottom }),
        classList: { contains: () => false },
        querySelector: () => ({ getBoundingClientRect: () => ({ top, height: 40 }) }),
    });
    const clock = {
        dataset: {},
        getBoundingClientRect: () => ({ top: 170, bottom: 230, height: 60 }),
        classList: { contains: (name) => name === 'addon-clock-block' },
    };
    const panel = {
        scrollTop: 0,
        getBoundingClientRect: () => ({ left: 0, right: 400, top: 0, bottom: 400 }),
        querySelectorAll: () => [card('a', 80, 140), clock, card('b', 240, 300)],
    };
    const originalDocument = globalThis.document;
    globalThis.document = { getElementById: () => panel };
    try {
        let saves = 0;
        const app = {
            ...addonMethods,
            settings: { addons: [above, below] },
            draggedAddonId: null,
            addonDragOffsetY: 0,
            addonDropTarget: null,
            addonPointer: null,
            save() { saves++; },
            $nextTick() {},
        };
        const handle = { focus() {}, setPointerCapture() {} };
        app.startAddonPointer({ button: 0, isPrimary: true, pointerId: 1, clientY: 100, currentTarget: handle, preventDefault() {} }, 'a');
        app.moveAddonPointer({ pointerId: 1, clientY: 250 });
        assert.equal(app.addonDragOffsetY, 150);
        assert.deepEqual(app.addonDropTarget, { id: 'b', after: false });
        app.finishAddonPointer({ pointerId: 1, clientX: 100, clientY: 250 });
        assert.deepEqual(app.settings.addons.map((addon) => [addon.id, addon.placement]), [['a', 'below'], ['b', 'below']]);
        assert.equal(saves, 1);
        assert.equal(app.draggedAddonId, null);
        app.startAddonPointer({ button: 0, isPrimary: true, pointerId: 2, clientY: 260, currentTarget: handle, preventDefault() {} }, 'b');
        app.moveAddonPointer({ pointerId: 2, clientY: 180 });
        assert.deepEqual(app.addonDropTarget, { placement: 'above' });
        app.finishAddonPointer({ pointerId: 2, clientX: 100, clientY: 180 });
        assert.deepEqual(app.settings.addons.map((addon) => [addon.id, addon.placement]), [['b', 'above'], ['a', 'below']]);
        assert.equal(saves, 2);
    } finally {
        globalThis.document = originalDocument;
    }
});

test('horizontal drag swaps paired members without splitting on a small movement', () => {
    const member = (id, left, right) => ({
        dataset: { addonId: id },
        getBoundingClientRect: () => ({ left, right, top: 80, bottom: 140 }),
        classList: { contains: () => false },
        querySelector: () => ({ getBoundingClientRect: () => ({ left, width: right - left, top: 80, height: 60 }) }),
    });
    const panel = {
        scrollTop: 0,
        getBoundingClientRect: () => ({ left: 0, right: 500, top: 0, bottom: 400 }),
        querySelectorAll: () => [member('date', 100, 220), member('region', 240, 360)],
    };
    const originalDocument = globalThis.document;
    globalThis.document = { getElementById: () => panel };
    try {
        const app = {
            ...addonMethods,
            settings: { addons: [
                { id: 'date', kind: 'date', placement: 'below', enabled: true },
                { id: 'region', kind: 'region_clock', placement: 'below', enabled: true },
            ], addon_pairs: [{ left_id: 'date', right_id: 'region', size_percent: 100 }] },
            draggedAddonId: null, addonDragOffsetX: 0, addonDragOffsetY: 0,
            addonDropTarget: null, addonPointer: null, dragWholePair: false,
            saves: 0, save() { this.saves++; }, $nextTick() {},
        };
        const handle = { focus() {}, setPointerCapture() {} };
        app.startAddonPointer({ button: 0, isPrimary: true, pointerId: 1, clientX: 300, clientY: 100, currentTarget: handle, preventDefault() {} }, 'region');
        app.finishAddonPointer({ pointerId: 1, clientX: 300, clientY: 110 });
        assert.equal(app.saves, 0);
        assert.equal(app.settings.addon_pairs[0].left_id, 'date');
        app.startAddonPointer({ button: 0, isPrimary: true, pointerId: 2, clientX: 300, clientY: 100, currentTarget: handle, preventDefault() {} }, 'region');
        app.moveAddonPointer({ pointerId: 2, clientX: 160, clientY: 100 });
        assert.equal(app.addonDropTarget.swap, true);
        app.finishAddonPointer({ pointerId: 2, clientX: 160, clientY: 100 });
        assert.deepEqual(app.settings.addons.map((addon) => addon.id), ['region', 'date']);
        assert.equal(app.settings.addon_pairs[0].left_id, 'region');
        assert.equal(app.saves, 1);
    } finally {
        globalThis.document = originalDocument;
    }
});

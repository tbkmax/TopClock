import assert from 'node:assert/strict';
import test from 'node:test';
import { createAddon } from '../model.js';
import { translate } from '../../i18n/index.js';
import { addonDefinitions } from '../registry.js';
import { createAddonController } from '../controller.js';
import { createAddonState } from '../state.js';
import { createAddonHost } from '../host.js';

test('controller routes only declared actions to the current enabled instance', async () => {
    const timer = createAddon('timer');
    const first = createAddon('progress');
    const second = createAddon('progress');
    first.options.mode = 'countdown';
    second.options.mode = 'countdown';
    const settings = { addons: [timer, first, second] };
    const calls = [];
    const controller = createAddonController({
        getSettings: () => settings,
        getState: () => ({ timerSession: { running: false }, progressTimerSessions: {} }),
        dispatchNative: async (addon, action) => { calls.push([addon.id, action]); return { running: true }; },
    });
    assert.deepEqual(controller.menuActions().map(({ instanceId, id }) => [instanceId, id]), [
        [timer.id, 'toggle'], [timer.id, 'reset'], [first.id, 'toggle'], [first.id, 'reset'],
        [second.id, 'toggle'], [second.id, 'reset'],
    ]);
    await controller.dispatch(second.id, 'toggle', 'primary-click');
    assert.deepEqual(calls, [[second.id, 'toggle']]);
    await controller.dispatch(first.id, 'reset', 'clock-menu');
    assert.deepEqual(calls, [[second.id, 'toggle'], [first.id, 'reset']]);
    first.enabled = false;
    assert.deepEqual(controller.menuActions().map(({ instanceId, id }) => [instanceId, id]), [
        [timer.id, 'toggle'], [timer.id, 'reset'], [second.id, 'toggle'], [second.id, 'reset'],
    ]);
    await assert.rejects(controller.dispatch(first.id, 'toggle', 'settings-button'), /unavailable/);
    settings.addons = settings.addons.filter((addon) => addon.id !== second.id);
    await assert.rejects(controller.dispatch(second.id, 'toggle', 'primary-click'), /unavailable/);
    assert.deepEqual(calls, [[second.id, 'toggle'], [first.id, 'reset']]);
});

test('menu switches list paired members separately and target one instance', async () => {
    const date = createAddon('date');
    const timer = createAddon('timer');
    const progress = createAddon('progress');
    date.enabled = timer.enabled = false;
    const settings = {
        addons: [date, timer, progress],
        addon_pairs: [{ left_id: date.id, right_id: timer.id, size_percent: 100 }],
    };
    const calls = [];
    const controller = createAddonController({
        getSettings: () => settings,
        getState: () => ({}),
        dispatchNative: async () => ({}),
        setEnabledNative: async (id, enabled) => { calls.push([id, enabled]); return settings; },
    });
    const entries = controller.toggleEntries((key, vars) => translate('en', key, vars));
    assert.equal(entries.length, 3);
    assert.equal(entries[0].name, 'Date');
    assert.equal(entries[0].paired, true);
    assert.match(entries[0].paletteName, /Combined/);
    assert.equal(entries[0].enabled, false);
    assert.equal(entries[1].name, 'Timer');
    assert.equal(entries[1].paired, true);
    assert.equal(entries[2].name, 'Progress 1');
    assert.equal(entries[2].paired, false);
    await controller.setEnabled(timer.id, true);
    assert.deepEqual(calls, [[timer.id, true]]);
    await assert.rejects(controller.setEnabled('removed', true), /unavailable/);
});

test('menu choices come from the definition and revalidate the selected instance', async () => {
    const first = createAddon('progress');
    const second = createAddon('progress');
    first.options.mode = second.options.mode = 'countdown';
    const settings = { addons: [first, second], progress_countdown_presets: [10, 30], progress_preset_warning_dismissed: false };
    const state = { progressTimerSessions: { [first.id]: { running: true, elapsed_ms: 500 } } };
    const calls = [];
    const controller = createAddonController({
        getSettings: () => settings,
        getState: () => state,
        dispatchNative: async () => ({}),
        dispatchMenuChoiceNative: async (addon, choice, confirmation) => {
            calls.push([addon.id, choice.value, confirmation]);
            return {};
        },
    });
    const groups = controller.menuEntries((key, vars) => translate('en', key, vars), 1000);
    assert.deepEqual(groups.map((entry) => entry.type), ['group', 'group']);
    assert.deepEqual(groups[0].choices.map((choice) => choice.value), [10, 30]);
    assert.equal(groups[0].choices[0].confirm.required, true);
    assert.equal(groups[1].choices[0].confirm.required, false);
    await controller.dispatchMenuChoice(first.id, 'preset-10', { confirmedReset: true });
    assert.deepEqual(calls, [[first.id, 10, { confirmedReset: true }]]);
    settings.progress_countdown_presets = [30];
    await assert.rejects(controller.dispatchMenuChoice(first.id, 'preset-10'), /unavailable/);
    second.enabled = false;
    await assert.rejects(controller.dispatchMenuChoice(second.id, 'preset-30'), /unavailable/);
    assert.equal(addonDefinitions.find((definition) => definition.kind === 'progress').detailsViewKey, 'progress-details');
});

test('add-on host labels read one reactive native session store', async () => {
    const previous = {
        MutationObserver: globalThis.MutationObserver,
        window: globalThis.window,
        document: globalThis.document,
    };
    globalThis.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };
    globalThis.window = { Element: class {} };
    globalThis.document = { createElement: () => ({}) };
    try {
        const { Alpine } = await import('alpinejs');
        const first = createAddon('progress');
        const second = createAddon('progress');
        first.options.mode = second.options.mode = 'countdown';
        let progressEvent;
        const host = createAddonHost({
            reactive: Alpine.reactive,
            getSettings: () => ({ addons: [first, second] }),
            adapter: {
                onTimer: async () => () => {},
                onProgress: async (callback) => { progressEvent = callback; return () => {}; },
                onCounter: async () => () => {},
                getTimer: async () => null,
                getProgress: async () => ({}),
                getCounter: async () => null,
                action: async () => ({ running: true }),
            },
        });
        await host.start();
        const snapshot = host.snapshot;
        const labels = [];
        const effect = Alpine.effect(() => {
            labels.push([first, second].map((addon) =>
                host.actionsFor(addon, 'settings-button')[0].labelKey));
        });
        assert.deepEqual(labels.at(-1), ['addons.start', 'addons.start']);

        await host.dispatch(first.id, 'toggle', 'settings-button');
        await Promise.resolve();
        assert.deepEqual(labels.at(-1), ['addons.pause', 'addons.start']);
        assert.equal(host.snapshot, snapshot);

        progressEvent({ [first.id]: { running: false }, [second.id]: { running: true } });
        await Promise.resolve();
        assert.deepEqual(labels.at(-1), ['addons.start', 'addons.pause']);
        assert.equal(host.snapshot, snapshot);
        Alpine.release(effect);
        host.dispose();
    } finally {
        Object.assign(globalThis, previous);
    }
});

test('add-on state keeps newer broadcasts and disposes its native listeners', async () => {
    let onTimer;
    let onProgress;
    let resolveTimer;
    let resolveAction;
    let stopped = 0;
    const updates = [];
    const state = createAddonState({
        reactive: (snapshot) => snapshot,
        adapter: {
            onTimer: async (callback) => { onTimer = callback; return () => { stopped++; }; },
            onProgress: async (callback) => { onProgress = callback; return () => { stopped++; }; },
            onCounter: async () => () => { stopped++; },
            getTimer: () => new Promise((resolve) => { resolveTimer = resolve; }),
            getProgress: async () => ({}),
            getCounter: async () => null,
            action: () => new Promise((resolve) => { resolveAction = resolve; }),
        },
        onChange: (snapshot) => updates.push(snapshot),
    });
    const start = state.start();
    await new Promise((resolve) => setImmediate(resolve));
    onTimer({ elapsed_ms: 200 });
    resolveTimer({ elapsed_ms: 100 });
    await start;
    assert.equal(state.snapshot.timerSession.elapsed_ms, 200);
    const action = state.dispatch({ kind: 'timer' }, 'toggle');
    onTimer({ elapsed_ms: 400 });
    resolveAction({ elapsed_ms: 300 });
    await action;
    assert.equal(state.snapshot.timerSession.elapsed_ms, 400);
    state.dispose();
    onTimer({ elapsed_ms: 500 });
    onProgress({});
    assert.equal(state.snapshot.timerSession.elapsed_ms, 400);
    assert.equal(stopped, 3);
    assert.ok(updates.length >= 2);
});

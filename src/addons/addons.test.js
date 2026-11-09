import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createAddon, displayAddon } from './model.js';
import { timerText } from './builtins/timer.js';
import { markCountdownCompletion, progressBarStyle, progressDisplay, validDateValue } from './builtins/progress-display.js';
import { addonMethods, reorderAddons } from './instance-editor.js';
import { translate, weekdayText } from '../i18n.js';
import { addonDefinitions } from './registry.js';
import { createAddonController } from './controller.js';
import { createAddonState } from './state.js';
import { createAddonHost } from './host.js';
import { composeAddonFragments } from './build-fragments.js';

test('bundled add-on views reject unknown slots and never use runtime HTML injection', () => {
    for (const page of ['index.html', 'settings.html']) {
        const html = composeAddonFragments(readFileSync(new URL(`../../${page}`, import.meta.url), 'utf8'));
        assert.doesNotMatch(html, /<!-- addon-view:/);
        assert.doesNotMatch(html, /\bx-html\s*=/);
        assert.match(html, /addon-instance|addon-line/);
        if (page === 'settings.html') {
            assert.equal((html.match(/class="addon-preview-clock"/g) || []).length, 1);
            assert.equal((html.match(/previewAddons\.filter\(\(addon\) => addon\.placement === 'above'\)/g) || []).length, 1);
            assert.equal((html.match(/previewAddons\.filter\(\(addon\) => addon\.placement === 'below'\)/g) || []).length, 1);
            assert.ok(html.indexOf("addon.placement === 'above'") < html.indexOf('class="addon-preview-clock"'));
            assert.ok(html.indexOf('class="addon-preview-clock"') < html.indexOf("addon.placement === 'below'"));
        }
    }
    assert.throws(() => composeAddonFragments('<!-- addon-view:unknown -->'), /Invalid add-on view slot/);
    assert.deepEqual(addonDefinitions.map(({ kind }) => kind), ['date', 'region_clock', 'timer', 'progress']);
});

test('bundled definitions keep the native kind and action fixture', () => {
    const fixture = JSON.parse(readFileSync(new URL('./contracts.json', import.meta.url), 'utf8'));
    assert.deepEqual(addonDefinitions.map(({ kind }) => kind), Object.keys(fixture));
    for (const definition of addonDefinitions) {
        const addon = createAddon(definition.kind);
        if (addon.kind === 'progress') addon.options.mode = 'countdown';
        const actions = definition.actions(addon, { timerSession: null, progressTimerSessions: {} });
        assert.deepEqual(actions.map(({ id }) => id), fixture[definition.kind]);
    }
});

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
        [timer.id, 'reset'], [first.id, 'toggle'], [first.id, 'reset'],
        [second.id, 'toggle'], [second.id, 'reset'],
    ]);
    await controller.dispatch(second.id, 'toggle', 'primary-click');
    assert.deepEqual(calls, [[second.id, 'toggle']]);
    await controller.dispatch(first.id, 'reset', 'clock-menu');
    assert.deepEqual(calls, [[second.id, 'toggle'], [first.id, 'reset']]);
    first.enabled = false;
    assert.deepEqual(controller.menuActions().map(({ instanceId, id }) => [instanceId, id]), [
        [timer.id, 'reset'], [second.id, 'toggle'], [second.id, 'reset'],
    ]);
    await assert.rejects(controller.dispatch(first.id, 'toggle', 'settings-button'), /unavailable/);
    settings.addons = settings.addons.filter((addon) => addon.id !== second.id);
    await assert.rejects(controller.dispatch(second.id, 'toggle', 'primary-click'), /unavailable/);
    assert.deepEqual(calls, [[second.id, 'toggle'], [first.id, 'reset']]);
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
                getTimer: async () => null,
                getProgress: async () => ({}),
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
            getTimer: () => new Promise((resolve) => { resolveTimer = resolve; }),
            getProgress: async () => ({}),
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
    assert.equal(stopped, 2);
    assert.ok(updates.length >= 2);
});

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

test('Timer display formats a saved countdown session', () => {
    const timer = { options: { mode: 'countdown', duration_seconds: 300 } };
    assert.equal(timerText(timer, { running: false, elapsed_ms: 1000 }, new Date('2026-10-29T13:04:05.000Z').getTime()), '04:59');
});

test('date weekday uses the selected language in clock and preview', () => {
    const date = new Date(2026, 9, 29, 13);
    const addon = { kind: 'date', options: { format: 'ymd', show_weekday: true } };
    for (const language of ['en', 'zh-Hans', 'zh-Hant', 'ja']) {
        const display = displayAddon(addon, date, {}, null, language);
        assert.equal(display.weekday, weekdayText(date, language));
        assert.equal(display.text, '2026-10-29');
    }
    assert.notEqual(weekdayText(date, 'zh-Hans'), weekdayText(date, 'en'));
    assert.notEqual(weekdayText(date, 'zh-Hant'), weekdayText(date, 'zh-Hans'));
    assert.notEqual(weekdayText(date, 'ja'), weekdayText(date, 'en'));
    assert.equal(translate('ja', 'general.system'), 'システム設定に従う');
});

test('date progress follows local calendar days and reaches a finished state', () => {
    const options = { mode: 'date', start_date: '2026-10-30', end_date: '2026-11-01' };
    assert.equal(progressDisplay(options, new Date(2026, 9, 29, 23, 59)).rows[0].percent, 0);
    assert.equal(progressDisplay(options, new Date(2026, 9, 30, 12)).rows[0].percent, 0);
    assert.equal(progressDisplay(options, new Date(2026, 9, 31, 12)).rows[0].percent, 50);
    const completed = progressDisplay(options, new Date(2026, 10, 1, 0));
    assert.equal(completed.rows[0].percent, 100);
    assert.equal(completed.rows[0].phase, 'complete');
    assert.equal(completed.hidden, false);
    assert.equal(validDateValue('2028-02-29'), true);
    assert.equal(validDateValue('2026-02-29'), false);
});

test('daily ranges have independent bars, finish pulse, final hide, and midnight reset', () => {
    const options = {
        mode: 'time', start_date: '2026-10-30', end_date: '2026-10-31',
        ranges: [{ start: '09:00', end: '10:00' }, { start: '12:00', end: '13:00' }],
        auto_hide: true,
    };
    assert.deepEqual(progressDisplay(options, new Date(2026, 9, 30, 11)).rows.map((row) => row.percent), [100, 0]);
    assert.deepEqual(progressDisplay(options, new Date(2026, 9, 30, 12, 30)).rows.map((row) => row.percent), [100, 50]);
    const finished = progressDisplay(options, new Date(2026, 9, 30, 13, 0, 0, 200));
    assert.equal(finished.rows[1].celebrating, true);
    assert.equal(finished.hidden, false);
    assert.equal(progressDisplay(options, new Date(2026, 9, 30, 13, 1)).hidden, true);
    const tomorrow = progressDisplay(options, new Date(2026, 9, 31, 8));
    assert.equal(tomorrow.hidden, false);
    assert.deepEqual(tomorrow.rows.map((row) => row.percent), [0, 0]);
});

test('weekday ranges show only scheduled bars and hide on unscheduled days', () => {
    const options = {
        mode: 'time', auto_hide: true,
        ranges: [
            { start: '09:00', end: '10:00', days: ['mon', 'wed'] },
            { start: '11:00', end: '12:00', days: ['wed'] },
        ],
    };
    const monday = progressDisplay(options, new Date(2026, 10, 2, 9, 30));
    assert.equal(monday.hidden, false);
    assert.deepEqual(monday.rows.map((item) => item.percent), [50]);
    assert.equal(progressDisplay(options, new Date(2026, 10, 2, 10, 1)).hidden, true);
    const tuesday = progressDisplay(options, new Date(2026, 10, 3, 9, 30));
    assert.equal(tuesday.hidden, true);
    assert.deepEqual(tuesday.rows, []);
    options.auto_hide = false;
    assert.equal(progressDisplay(options, new Date(2026, 10, 3, 9, 30)).hidden, true);
    const wednesday = progressDisplay(options, new Date(2026, 10, 4, 11, 30));
    assert.deepEqual(wednesday.rows.map((item) => item.percent), [100, 50]);
    options.ranges[0].days = [];
    assert.equal(progressDisplay(options, new Date(2026, 10, 3, 9, 30)).rows.length, 1);
});

test('new progress instances do not share ranges or dates', () => {
    const first = createAddon('progress');
    const second = createAddon('progress');
    assert.equal(first.options.start_date, second.options.start_date);
    first.options.ranges[0].start = '08:00';
    first.options.end_date = '2030-01-01';
    assert.equal(second.options.ranges[0].start, '09:00');
    assert.notEqual(second.options.end_date, first.options.end_date);
});

test('Progress defaults to bar-only display and scales length and thickness independently', () => {
    const addon = createAddon('progress');
    assert.equal(addon.options.show_percentage, false);
    const defaultStyle = progressBarStyle(addon, 42);
    assert.ok(Math.abs(parseFloat(defaultStyle['--progress-length']) - 128.52) < 1e-9);
    assert.ok(Math.abs(parseFloat(defaultStyle['--progress-thickness']) - 5.67) < 1e-9);
    const legacy = { ...addon, options: { ...addon.options } };
    delete legacy.options.show_percentage;
    delete legacy.options.bar_length_percent;
    delete legacy.options.bar_thickness_percent;
    assert.deepEqual(progressBarStyle(legacy, 42), defaultStyle);
    addon.options.bar_length_percent = 50;
    addon.options.bar_thickness_percent = 150;
    assert.ok(Math.abs(parseFloat(progressBarStyle(addon, 42)['--progress-length']) - 75.6) < 1e-9);
    assert.ok(Math.abs(parseFloat(progressBarStyle(addon, 42)['--progress-thickness']) - 8.505) < 1e-9);
});

test('progress Settings edits preserve valid saved ranges and mode values', () => {
    const addon = createAddon('progress');
    let saves = 0;
    const app = {
        ...addonMethods,
        settings: { addons: [addon] },
        save() { saves++; },
        t(key) { return key; },
        error: '',
    };
    app.addProgressRange(addon.id);
    assert.equal(addon.options.ranges.length, 2);
    assert.equal(app.progressWeekdaySelected(addon.options.ranges[0], 'mon'), true);
    app.setProgressWeekday(addon.id, 0, 'mon');
    assert.equal(app.progressWeekdaySelected(addon.options.ranges[0], 'mon'), false);
    assert.equal(addon.options.ranges[0].days.length, 6);
    app.setProgressWeekday(addon.id, 0, 'mon');
    assert.equal(addon.options.ranges[0].days, undefined);
    addon.options.ranges[0].days = ['mon'];
    addon.options.ranges[1].days = ['wed'];
    assert.equal(app.updateProgressRangeTimes(addon.id, 1, '09:30', '10:30'), 1);
    assert.equal(addon.options.ranges[1].start, '09:30');
    const beforeOverlap = saves;
    app.setProgressWeekday(addon.id, 1, 'mon');
    assert.equal(saves, beforeOverlap);
    assert.deepEqual(addon.options.ranges[1].days, ['wed']);
    app.setProgressWeekday(addon.id, 1, 'wed');
    assert.deepEqual(addon.options.ranges[1].days, ['wed']);
    const saved = saves;
    assert.equal(app.updateProgressRangeTimes(addon.id, 1, '09:30', '09:30'), null);
    assert.equal(saves, saved);
    assert.equal(addon.options.ranges[1].end, '10:30');
    assert.equal(app.error, 'addons.invalidProgressRange');
    app.setProgressWeekday(addon.id, 0, null);
    assert.deepEqual(addon.options.ranges[0].days, ['mon']);
    assert.equal(app.error, 'addons.invalidProgressRange');
    app.setProgressMode(addon.id, 'time');
    app.setProgressMode(addon.id, 'date');
    assert.equal(addon.options.ranges.length, 2);
    app.updateProgressDate(addon.id, 'end_date', addon.options.start_date);
    assert.equal(app.error, 'addons.invalidProgressDate');
    app.updateProgressAppearance(addon.id, 'show_percentage', true);
    assert.equal(addon.options.show_percentage, true);
    const afterAppearance = saves;
    app.updateProgressAppearance(addon.id, 'bar_length_percent', 151);
    assert.equal(saves, afterAppearance);
    app.updateProgressAppearance(addon.id, 'bar_length_percent', 90);
    assert.equal(addon.options.bar_length_percent, 90);
});

test('adding a period reuses an hour on weekdays where that hour is free', () => {
    const addon = createAddon('progress');
    addon.options.ranges = [{ start: '09:00', end: '10:00', days: ['mon'] }];
    const app = { ...addonMethods, settings: { addons: [addon] }, save() {} };
    assert.equal(app.addProgressRange(addon.id), 1);
    assert.equal(addon.options.ranges[1].start, '09:00');
    assert.equal(addon.options.ranges[1].end, '10:00');
    assert.equal(app.progressWeekdaySelected(addon.options.ranges[1], 'mon'), false);
    assert.equal(app.progressWeekdaySelected(addon.options.ranges[1], 'wed'), true);
});

test('Progress countdowns have independent elapsed bars and a completion pulse', () => {
    const first = createAddon('progress');
    const second = createAddon('progress');
    first.options.mode = 'countdown';
    second.options.mode = 'countdown';
    first.options.countdown_seconds = 10;
    second.options.countdown_seconds = 20;
    const sessions = {
        [first.id]: { running: true, elapsed_ms: 2000, started_at_ms: 1000, finished: false },
        [second.id]: { running: false, elapsed_ms: 5000, started_at_ms: null, finished: false },
    };
    const now = new Date(4000);
    assert.equal(displayAddon(first, now, {}, null, 'en', sessions).progress.rows[0].percent, 50);
    assert.equal(displayAddon(second, now, {}, null, 'en', sessions).progress.rows[0].percent, 25);
    assert.equal(progressDisplay(first.options, new Date(1000)).rows[0].percent, 0);
    const previous = { [first.id]: 50 };
    const activeUntil = {};
    const done = displayAddon(first, new Date(9000), {}, null, 'en', sessions);
    markCountdownCompletion(done, first, previous, activeUntil, 9000);
    assert.equal(done.progress.rows[0].percent, 100);
    assert.equal(done.progress.rows[0].celebrating, true);
    assert.equal(done.progress.rows[0].phase, 'complete');
    const later = displayAddon(first, new Date(10500), {}, null, 'en', sessions);
    markCountdownCompletion(later, first, previous, activeUntil, 10500);
    assert.equal(later.progress.rows[0].celebrating, false);
});

test('Progress countdown minutes lock after Start through Pause, then unlock on finish or Reset', () => {
    const first = createAddon('progress');
    const second = createAddon('progress');
    const app = {
        ...addonMethods,
        settings: { addons: [first, second] },
        progressTimerSessions: {
            [first.id]: { running: false, elapsed_ms: 0, started_at_ms: null, finished: false, has_started: true },
            [second.id]: { running: true, elapsed_ms: 0, started_at_ms: 1000, finished: false, has_started: true },
        },
        saveCount: 0,
        save() { this.saveCount++; },
    };
    app.addonHost = { setProgress(sessions) { app.progressTimerSessions = sessions; } };
    app.setProgressMode(first.id, 'countdown');
    app.setProgressMode(second.id, 'countdown');
    assert.equal(app.progressCountdownDurationLocked(first.id), true);
    assert.equal(app.progressCountdownDurationLocked(second.id), true);
    app.updateProgressCountdownDuration(first.id, 12);
    assert.equal(first.options.countdown_seconds, 300);
    app.updateProgressCountdownDuration(second.id, 12);
    assert.equal(second.options.countdown_seconds, 300);
    assert.equal(app.saveCount, 2);
    app.progressTimerSessions[first.id] = { ...app.progressTimerSessions[first.id], finished: true };
    assert.equal(app.progressCountdownDurationLocked(first.id), false);
    app.updateProgressCountdownDuration(first.id, 12);
    assert.equal(first.options.countdown_seconds, 720);
    assert.equal(app.progressTimerSessions[first.id].has_started, false);
    assert.equal(app.progressTimerSessions[second.id].running, true);
    app.progressTimerSessions[first.id] = { running: false, elapsed_ms: 0, started_at_ms: null, finished: false, has_started: false };
    app.updateProgressCountdownDuration(first.id, 13);
    assert.equal(first.options.countdown_seconds, 780);
    assert.equal(app.saveCount, 4);
});

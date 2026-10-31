import assert from 'node:assert/strict';
import test from 'node:test';
import { createAddon, displayAddon, timerText } from './addons.js';
import { markCountdownCompletion, progressBarStyle, progressDisplay, validDateValue } from './progress.js';
import { addonMethods, reorderAddons } from './settings-addons.js';
import { resolveLanguage, translate, weekdayText } from './i18n.js';
import { markChangedNumbers } from './clock-animations.js';
import { createSettingsPersistence } from './settings-persistence.js';
import { DEFAULT_SHORTCUTS, shortcutConflict, supportedGlobalKey } from './settings-shortcuts.js';
import { nextSettingsTab } from './settings-tabs.js';
import { timeParts } from './time-format.js';

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

test('settings saves a snapshot and commits it in order', async () => {
    const writes = [];
    const controller = createSettingsPersistence({
        write: async (settings) => { writes.push(settings); return settings; },
        preview: async () => {},
        onCommit: () => {},
        onRollback: () => assert.fail('unexpected rollback'),
        onError: () => assert.fail('unexpected save error'),
    });
    controller.setCommitted({ font_size: 42, shortcuts: { quit: 'Ctrl+Alt+Q' } });
    const draft = { font_size: 64, shortcuts: { quit: 'Ctrl+Alt+Q' } };
    controller.schedule(draft);
    draft.shortcuts.quit = 'Ctrl+Q';
    assert.equal(await controller.flush(), true);
    assert.deepEqual(writes, [{ font_size: 64, shortcuts: { quit: 'Ctrl+Alt+Q' } }]);
    assert.equal(controller.hasPending(), false);
});

test('failed latest save restores the last persisted settings and clock preview', async () => {
    const previews = [];
    let restored;
    let error;
    const controller = createSettingsPersistence({
        write: async () => { throw new Error('disk full'); },
        preview: async (settings) => { previews.push(settings.font_size); },
        onCommit: () => assert.fail('unexpected commit'),
        onRollback: (settings) => { restored = settings; },
        onError: (failure) => { error = failure; },
    });
    controller.setCommitted({ font_size: 42 });
    controller.schedule({ font_size: 64 });
    assert.equal(await controller.flush(), false);
    assert.deepEqual(restored, { font_size: 42 });
    assert.deepEqual(previews, [64, 42]);
    assert.match(error.message, /disk full/);
});

test('a failed command can recover settings already written before an event error', async () => {
    const previews = [];
    let committed = 0;
    const controller = createSettingsPersistence({
        write: async () => { throw new Error('event unavailable after write'); },
        preview: async (settings) => { previews.push(settings.font_size); },
        recover: async () => ({ font_size: 64 }),
        onCommit: () => { committed++; },
        onRollback: () => assert.fail('unexpected rollback'),
        onError: () => assert.fail('unexpected save error'),
    });
    controller.setCommitted({ font_size: 42 });
    controller.schedule({ font_size: 64 });
    assert.equal(await controller.flush(), true);
    assert.deepEqual(previews, [64]);
    assert.equal(committed, 1);
});

test('an older failed save does not roll back a newer draft', async () => {
    let failFirst;
    const writes = [];
    const rollbacks = [];
    const controller = createSettingsPersistence({
        write: (settings) => {
            writes.push(settings.font_size);
            if (settings.font_size === 64) return new Promise((_, reject) => { failFirst = reject; });
            return Promise.resolve(settings);
        },
        preview: async () => {},
        onCommit: () => {},
        onRollback: (settings) => { rollbacks.push(settings); },
        onError: () => {},
    });
    controller.setCommitted({ font_size: 42 });
    controller.schedule({ font_size: 64 });
    const first = controller.flush();
    await Promise.resolve();
    controller.schedule({ font_size: 72 });
    const latest = controller.flush();
    failFirst(new Error('first write failed'));
    assert.equal(await first, false);
    assert.equal(await latest, true);
    assert.deepEqual(writes, [64, 72]);
    assert.deepEqual(rollbacks, []);
});

test('a new edit made during native readback is kept', async () => {
    let enterRecovery;
    let finishRecovery;
    const recoveryStarted = new Promise((resolve) => { enterRecovery = resolve; });
    const previews = [];
    const rollbacks = [];
    const controller = createSettingsPersistence({
        write: async (settings) => {
            if (settings.font_size === 64) throw new Error('write failed');
            return settings;
        },
        preview: async (settings) => { previews.push(settings.font_size); },
        recover: () => {
            enterRecovery();
            return new Promise((resolve) => { finishRecovery = resolve; });
        },
        onCommit: () => {},
        onRollback: (settings) => { rollbacks.push(settings); },
        onError: () => {},
    });
    controller.setCommitted({ font_size: 42 });
    controller.schedule({ font_size: 64 });
    const first = controller.flush();
    await recoveryStarted;
    controller.schedule({ font_size: 72 });
    const latest = controller.flush();
    finishRecovery({ font_size: 64 });
    assert.equal(await first, false);
    assert.equal(await latest, true);
    assert.deepEqual(rollbacks, []);
    assert.deepEqual(previews, [64, 72]);
});

test('shortcut conflicts respect enabled actions and Timer availability', () => {
    const shortcuts = {
        ...DEFAULT_SHORTCUTS,
        open_settings_enabled: true,
        quit_enabled: true,
        quit: 'ctrl+,',
        timer_toggle_enabled: true,
        timer_toggle: 'Ctrl+,',
    };
    assert.equal(shortcutConflict(shortcuts, false, 'open_settings'), 'Quit TopClock');
    assert.equal(shortcutConflict(shortcuts, false, 'timer_toggle'), null);
    assert.equal(shortcutConflict(shortcuts, true, 'timer_toggle'), 'Open Settings');
    assert.equal(supportedGlobalKey('F24'), true);
    assert.equal(supportedGlobalKey('F25'), false);
});

test('Settings tabs wrap through arrow keys and support Home and End', () => {
    assert.equal(nextSettingsTab('general', 'ArrowDown'), 'clock');
    assert.equal(nextSettingsTab('clock', 'ArrowUp'), 'general');
    assert.equal(nextSettingsTab('addons', 'Home'), 'clock');
    assert.equal(nextSettingsTab('addons', 'End'), 'general');
    assert.equal(nextSettingsTab('addons', 'Enter'), null);
});

test('time, Timer, and number transition helpers keep their display contracts', () => {
    const now = new Date('2026-10-29T13:04:05.000Z');
    assert.deepEqual(timeParts(now, { time_layout: 'hm', twenty_four_hour: false, show_ampm: true }, 'Etc/UTC'), [
        { kind: 'h', text: '1' }, { kind: 'separator', text: ':' }, { kind: 'm', text: '04' }, { kind: 'ampm', text: 'PM' },
    ]);
    const timer = { options: { mode: 'countdown', duration_seconds: 300 } };
    assert.equal(timerText(timer, { running: false, elapsed_ms: 1000 }, now.getTime()), '04:59');
    const changed = markChangedNumbers([{ kind: 'h', text: '2' }], { h: '1' }, {}, 1000);
    assert.equal(changed.parts[0].changing, true);
    assert.equal(changed.activeUntil.h, 1300);
});

test('system language distinguishes Chinese scripts and Japanese', () => {
    assert.equal(resolveLanguage('system', 'zh-CN'), 'zh-Hans');
    assert.equal(resolveLanguage('system', 'zh-SG'), 'zh-Hans');
    assert.equal(resolveLanguage('system', 'zh-TW'), 'zh-Hant');
    assert.equal(resolveLanguage('system', 'zh-HK'), 'zh-Hant');
    assert.equal(resolveLanguage('system', 'ja-JP'), 'ja');
    assert.equal(resolveLanguage('system', 'fr-FR'), 'en');
    assert.equal(resolveLanguage('zh-Hant', 'ja-JP'), 'zh-Hant');
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
    const saved = saves;
    app.updateProgressRange(addon.id, 1, 'start', '10:00');
    assert.equal(saves, saved);
    assert.equal(addon.options.ranges[1].start, '17:00');
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

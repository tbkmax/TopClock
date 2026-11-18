import assert from 'node:assert/strict';
import test from 'node:test';
import { createAddon, displayAddon } from '../model.js';
import { markCountdownCompletion, progressBarStyle, progressDisplay, validDateValue } from '../builtins/progress-display.js';
import { addonMethods } from '../instance-editor.js';

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
    assert.equal(displayAddon(first, now, {}, { progressTimerSessions: sessions }).progress.rows[0].percent, 50);
    assert.equal(displayAddon(second, now, {}, { progressTimerSessions: sessions }).progress.rows[0].percent, 25);
    assert.equal(progressDisplay(first.options, new Date(1000)).rows[0].percent, 0);
    const previous = { [first.id]: 50 };
    const activeUntil = {};
    const done = displayAddon(first, new Date(9000), {}, { progressTimerSessions: sessions });
    markCountdownCompletion(done, first, previous, activeUntil, 9000);
    assert.equal(done.progress.rows[0].percent, 100);
    assert.equal(done.progress.rows[0].celebrating, true);
    assert.equal(done.progress.rows[0].phase, 'complete');
    const later = displayAddon(first, new Date(10500), {}, { progressTimerSessions: sessions });
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

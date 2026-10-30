import assert from 'node:assert/strict';
import test from 'node:test';
import { displayAddon, timerText } from './addons.js';
import { resolveLanguage, translate, weekdayText } from './i18n.js';
import { markChangedNumbers } from './clock-animations.js';
import { createSettingsPersistence } from './settings-persistence.js';
import { DEFAULT_SHORTCUTS, shortcutConflict, supportedGlobalKey } from './settings-shortcuts.js';
import { nextSettingsTab } from './settings-tabs.js';
import { timeParts } from './time-format.js';

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

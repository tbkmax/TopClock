import assert from 'node:assert/strict';
import test from 'node:test';
import { createAddon } from '../model.js';
import { createAddonController } from '../controller.js';
import { timerText } from '../builtins/timer.js';

test('Timer menu separates mode and own presets with reset confirmation', async () => {
    const timer = createAddon('timer');
    const settings = { addons: [timer], timer_countdown_presets: [5, 15], timer_reset_warning_dismissed: false, timer_preset_warning_dismissed: false };
    const state = { timerSession: { running: true, elapsed_ms: 1000, started_at_ms: 0 } };
    const calls = [];
    const controller = createAddonController({
        getSettings: () => settings,
        getState: () => state,
        dispatchNative: async () => ({}),
        dispatchMenuChoiceNative: async (_addon, choice, confirmation) => {
            calls.push([choice.id, confirmation]);
            return { running: false };
        },
    });
    let entry = controller.menuEntries((key) => key, 2000)[0];
    assert.deepEqual(entry.sections.map((section) => section.id), ['mode', 'set']);
    assert.equal(entry.sections[0].choices[0].selected, true);
    assert.equal(entry.sections[0].choices[1].confirm.required, true);
    assert.deepEqual(entry.sections[1].choices.map((choice) => choice.value), [5, 15]);
    assert.equal(entry.sections[1].choices[0].confirm.required, true);
    await controller.dispatchMenuChoice(timer.id, 'mode-stopwatch', { confirmedReset: true, dontShowAgain: true });
    assert.deepEqual(calls, [['mode-stopwatch', { confirmedReset: true, dontShowAgain: true }]]);
    timer.options.mode = 'stopwatch';
    entry = controller.menuEntries((key) => key, 2000)[0];
    assert.deepEqual(entry.sections.map((section) => section.id), ['mode']);
    await assert.rejects(controller.dispatchMenuChoice(timer.id, 'preset-5'), /unavailable/);
    timer.enabled = false;
    assert.deepEqual(controller.menuEntries((key) => key), []);
});

test('Timer display formats a saved countdown session', () => {
    const timer = { options: { mode: 'countdown', duration_seconds: 300 } };
    assert.equal(timerText(timer, { running: false, elapsed_ms: 1000 }, new Date('2026-10-29T13:04:05.000Z').getTime()), '04:59');
});

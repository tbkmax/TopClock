import assert from 'node:assert/strict';
import test from 'node:test';
import { createAddon, displayAddon } from '../model.js';
import { counterDisplay } from '../builtins/counter.js';
import { addonCatalog, addonDefinitions } from '../registry.js';
import { createAddonController } from '../controller.js';

test('Counter display keeps a signed balance and scales to days', async () => {
    const session = { value_ms: 2 * 3600000, running: true, direction: -1, started_at_ms: 1000 };
    const glowStyle = { '--text-glow-near-alpha': '0.900', '--text-glow-far-alpha': '0.500' };
    assert.deepEqual(counterDisplay(session, 1000), { text: '2:00:00', color: '#3b82f6', direction: 'positive', motion: 'down', glowStyle });
    assert.deepEqual(counterDisplay({ ...session, direction: 1 }, 1000),
        { text: '2:00:00', color: '#3b82f6', direction: 'positive', motion: 'up', glowStyle });
    assert.deepEqual(counterDisplay(session, 4 * 3600000 + 1000), { text: '2:00:00', color: '#ef4444', direction: 'negative', motion: 'down', glowStyle });
    assert.deepEqual(counterDisplay({ value_ms: 2 * 3600000, running: false, direction: -1 }, 0),
        { text: '2:00:00', color: '#93c5fd', direction: 'positive', motion: null, glowStyle: null });
    assert.deepEqual(counterDisplay({ value_ms: -2 * 3600000, running: false }, 0),
        { text: '2:00:00', color: '#fca5a5', direction: 'negative', motion: null, glowStyle: null });
    assert.deepEqual(counterDisplay({ value_ms: 0, running: false }, 0),
        { text: '0:00:00', color: null, direction: 'zero', motion: null, glowStyle: null });
    assert.deepEqual(counterDisplay({ value_ms: -2 * 3600000, running: true, direction: 1, started_at_ms: 0 }, 0),
        { text: '2:00:00', color: '#ef4444', direction: 'negative', motion: 'up', glowStyle });
    assert.deepEqual(counterDisplay({ value_ms: 0, running: true, direction: 1, started_at_ms: 0 }, 0),
        { text: '0:00:00', color: null, direction: 'zero', motion: 'up', glowStyle });
    assert.deepEqual(counterDisplay({ value_ms: 0, running: true, direction: -1, started_at_ms: 0 }, 0),
        { text: '0:00:00', color: null, direction: 'zero', motion: 'down', glowStyle });
    assert.deepEqual(counterDisplay(session, 1000, 0).glowStyle,
        { '--text-glow-near-alpha': '0.000', '--text-glow-far-alpha': '0.000' });
    assert.deepEqual(counterDisplay(session, 1000, 100).glowStyle,
        { '--text-glow-near-alpha': '1.000', '--text-glow-far-alpha': '1.000' });
    assert.equal(counterDisplay({ value_ms: 3723000, running: false }, 0).text, '1:02:03');
    assert.equal(counterDisplay({ value_ms: 12 * 3600000 + 123000, running: false }, 0).text, '12:02:03');
    assert.equal(counterDisplay({ value_ms: 100 * 3600000 - 1000, running: false }, 0).text, '99:59:59');
    assert.deepEqual(counterDisplay({ value_ms: 100 * 3600000, running: false }, 0),
        { text: '4:04:00', color: '#93c5fd', direction: 'positive', motion: null, glowStyle: null });
    assert.equal(counterDisplay({ value_ms: 100 * 3600000 + 59 * 60000, running: false }, 0).text, '4:04:59');
    const counter = createAddon('counter');
    assert.deepEqual(counter.options, {});
    const definition = addonDefinitions.find(({ kind }) => kind === 'counter');
    assert.equal(definition.detailsViewKey, 'counter-details');
    assert.equal(addonCatalog.find(({ kind }) => kind === 'counter').hasDetails, true);
    assert.deepEqual(displayAddon(counter, new Date(1000), {}, { counterSession: session }).glowStyle, glowStyle);
    assert.deepEqual(displayAddon(counter, new Date(1000), { counter_halo_intensity_percent: 75 }, { counterSession: session }).glowStyle,
        { '--text-glow-near-alpha': '1.000', '--text-glow-far-alpha': '0.750' });
    assert.deepEqual(displayAddon(counter, new Date(1000), { counter_halo_intensity_percent: 0 }, { counterSession: session }).glowStyle,
        { '--text-glow-near-alpha': '0.000', '--text-glow-far-alpha': '0.000' });
    const calls = [];
    const controller = createAddonController({
        getSettings: () => ({ addons: [counter] }),
        getState: () => ({ counterSession: session }),
        dispatchNative: async (_addon, action, options) => { calls.push([action, options]); return {}; },
    });
    assert.deepEqual(controller.menuEntries((key) => key)[0].actions.map((action) => action.id),
        ['start_positive', 'start_negative', 'stop']);
    assert.equal(controller.actionsFor(counter, 'primary-click').length, 0);
    assert.deepEqual(controller.actionsFor(counter, 'counter-reset').map((action) => action.id), ['reset']);
    await assert.rejects(controller.dispatch(counter.id, 'reset', 'clock-menu'), /unavailable/);
    await controller.dispatch(counter.id, 'reset', 'counter-reset', { confirmedReset: true });
    assert.deepEqual(calls, [['reset', { confirmedReset: true }]]);
});

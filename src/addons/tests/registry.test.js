import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createAddon } from '../model.js';
import { addonDefinitions } from '../registry.js';
import { composeAddonFragments } from '../build-fragments.js';

test('bundled add-on views reject unknown slots and never use runtime HTML injection', () => {
    for (const page of ['index.html', 'settings.html']) {
        const html = composeAddonFragments(readFileSync(new URL(`../../../${page}`, import.meta.url), 'utf8'));
        assert.doesNotMatch(html, /<!-- addon-view:/);
        assert.doesNotMatch(html, /\bx-html\s*=/);
        assert.match(html, /addon-instance|addon-line/);
        if (page === 'settings.html') {
            assert.equal((html.match(/class="addon-preview-clock"/g) || []).length, 1);
            assert.equal((html.match(/previewLayout\(\)\.filter\(\(item\) => item\.placement === 'above'\)/g) || []).length, 1);
            assert.equal((html.match(/previewLayout\(\)\.filter\(\(item\) => item\.placement === 'below'\)/g) || []).length, 1);
            assert.ok(html.indexOf("item.placement === 'above'") < html.indexOf('class="addon-preview-clock"'));
            assert.ok(html.indexOf('class="addon-preview-clock"') < html.indexOf("item.placement === 'below'"));
        }
    }
    assert.throws(() => composeAddonFragments('<!-- addon-view:unknown -->'), /Invalid add-on view slot/);
    assert.deepEqual(addonDefinitions.map(({ kind }) => kind), ['date', 'region_clock', 'timer', 'progress', 'counter']);
});

test('bundled definitions keep the native kind and action fixture', () => {
    const fixture = JSON.parse(readFileSync(new URL('../contracts.json', import.meta.url), 'utf8'));
    assert.deepEqual(addonDefinitions.map(({ kind }) => kind), Object.keys(fixture));
    for (const definition of addonDefinitions) {
        const addon = createAddon(definition.kind);
        if (addon.kind === 'progress') addon.options.mode = 'countdown';
        const actions = definition.actions(addon, { timerSession: null, progressTimerSessions: {} });
        assert.deepEqual(actions.map(({ id }) => id), fixture[definition.kind]);
    }
});

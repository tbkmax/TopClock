import assert from 'node:assert/strict';
import { fitSectorLabel, pageNodes, paletteTree, pendingPaletteChoice, ringAndIndex } from './palette-model.js';

const t = (key) => key;
const timer = {
    type: 'group', instanceId: 'timer-1', name: 'Timer',
    actions: [{ id: 'toggle', labelKey: 'Start' }],
    sections: [{ id: 'set', labelKey: 'Set', choices: [{ id: 'preset-10', labelKey: '10 min',
        confirm: { required: true } }] }],
};
const nodes = paletteTree([timer], [{ id: 'date-1', name: 'Date', enabled: true }], t);
assert.equal(nodes[0].operation.type, 'settings');
assert.equal(nodes[1].children[1].children[0].operation.choiceId, 'preset-10');
assert.equal(nodes[2].children[0].operation.enabled, false);
assert.equal(nodes.at(-1).operation.type, 'quit');
assert.equal(pendingPaletteChoice([{ ...timer, choices: timer.sections[0].choices }],
    { instance_id: 'timer-1', choice_id: 'preset-10' }).choice.id, 'preset-10');
assert.equal(pendingPaletteChoice([{ ...timer, choices: timer.sections[0].choices }],
    { instance_id: 'timer-1', choice_id: 'missing' }), null);
const switches = Array.from({ length: 16 }, (_, index) => ({ id: `addon-${index}`, name: `Addon ${index}`, enabled: true }));
const switchTree = paletteTree([], switches, t);
assert.equal(switchTree[1].children.length, 3);
assert.equal(switchTree[1].children[2].children.length, 4);
assert.equal(switchTree[1].children[2].children[3].operation.instanceId, 'addon-15');

const pairedSwitches = paletteTree([], [
    { id: 'date', name: 'Date', paletteName: 'Date · Combined', paired: true, enabled: true },
    { id: 'counter', name: 'Counter', paletteName: 'Counter · Combined', paired: true, enabled: false },
], t)[1].children;
assert.deepEqual(pairedSwitches.map((node) => [node.label, node.sectorLabel, node.operation.instanceId, node.operation.enabled]), [
    ['Date · Combined', 'Date ⛓', 'date', false], ['Counter · Combined', 'Counter ⛓', 'counter', true],
]);

const many = Array.from({ length: 17 }, (_, index) => ({ id: `node-${index}` }));
assert.equal(pageNodes(many, 0, t).length, 7);
assert.equal(pageNodes(many, 1, t).length, 8);
assert.equal(pageNodes(many, 2, t).at(0).page, 1);

const pointer = { x: 100, y: 0, center_x: 0, center_y: 0 };
assert.deepEqual(ringAndIndex(pointer, [{}, {}, {}, {}]), { ring: 0, index: 1, distance: 100 });
assert.equal(ringAndIndex({ ...pointer, x: 0, y: 0 }, [{}]), null);
assert.equal(ringAndIndex({ ...pointer, x: 340 }, [{}]), null);

const measure = (value) => Array.from(value).length * 8;
const combinedLabel = fitSectorLabel('Date+Counter', 58, 148, 8, measure);
assert.equal(combinedLabel.text, 'Date+Counter');
assert.ok(combinedLabel.fontSize < 14 && combinedLabel.fontSize >= 10);
assert.deepEqual(fitSectorLabel('Date', 58, 148, 1, measure), { text: 'Date', fontSize: 14 });
const longLabel = fitSectorLabel('A very long combined add-on name', 58, 148, 8, measure);
assert.ok(longLabel.text.endsWith('…'));
assert.ok(measure(longLabel.text) * longLabel.fontSize / 14 <= 2 * 103 * Math.sin(Math.PI / 8) - 10);

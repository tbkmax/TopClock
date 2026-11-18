import assert from 'node:assert/strict';
import test from 'node:test';
import { displayAddon } from '../model.js';
import { translate, weekdayText } from '../../i18n/index.js';

test('date weekday uses the selected language in clock and preview', () => {
    const date = new Date(2026, 9, 29, 13);
    const addon = { kind: 'date', options: { format: 'ymd', show_weekday: true } };
    for (const language of ['en', 'zh-Hans', 'zh-Hant', 'ja']) {
        const display = displayAddon(addon, date, {}, { language });
        assert.equal(display.weekday, weekdayText(date, language));
        assert.equal(display.text, '2026-10-29');
    }
    assert.notEqual(weekdayText(date, 'zh-Hans'), weekdayText(date, 'en'));
    assert.notEqual(weekdayText(date, 'zh-Hant'), weekdayText(date, 'zh-Hans'));
    assert.notEqual(weekdayText(date, 'ja'), weekdayText(date, 'en'));
    assert.equal(translate('ja', 'general.system'), 'システム設定に従う');
});

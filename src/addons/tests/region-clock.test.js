import assert from 'node:assert/strict';
import test from 'node:test';
import { availableTimeZones } from '../builtins/region-clock.js';
import { createTimeZoneOptions, filterTimeZones, regionZonePicker } from '../builtins/region-picker.js';

test('region picker searches all mapped countries, cities, and zone IDs', () => {
    const options = createTimeZoneOptions(availableTimeZones(), 'ja');
    const ids = (query) => filterTimeZones(options, query).map(({ id }) => id);
    assert.deepEqual(options.filter(({ id, countries }) => id !== 'Etc/UTC' && !countries.length), []);
    for (const [query, zone] of [
        ['taipei', 'Asia/Taipei'], ['Taiwan', 'Asia/Taipei'], ['Japan', 'Asia/Tokyo'],
        ['China', 'Asia/Shanghai'], ['United States', 'America/Los_Angeles'],
        ['Brazil', 'America/Sao_Paulo'], ['South Africa', 'Africa/Johannesburg'],
        ['Asia/Taipei', 'Asia/Taipei'],
    ]) assert.ok(ids(query).includes(zone), `${query} should find ${zone}`);
    assert.ok(filterTimeZones(options, 'India')[0].countries.some(({ code }) => code === 'IN'));
    assert.ok(ids('日本').includes('Asia/Tokyo'));
    const addon = { options: { time_zone: 'Etc/UTC' } };
    const picker = regionZonePicker(addon, options);
    picker.openPicker();
    picker.query = 'taipei';
    assert.deepEqual(picker.matches.map(({ id }) => id), ['Asia/Taipei']);
    addon.options.time_zone = picker.choose(picker.matches[0].id);
    assert.equal(addon.options.time_zone, 'Asia/Taipei');
    assert.match(picker.query, /Taipei/);
    assert.equal(regionZonePicker({ options: {} }, options).query, 'UTC');
});

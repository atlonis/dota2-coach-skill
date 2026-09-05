import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntityCatalog, entityRef } from '../lib/entities.mjs';

const catalog = buildEntityCatalog({
  heroes: { 90: { id: 90, name: 'npc_dota_hero_keeper_of_the_light', localized_name: 'Keeper of the Light' } },
  items: {
    force_staff: { id: 102, dname: 'Force Staff' },
    glimmer_cape: { id: 254, dname: 'Glimmer Cape' },
  },
  abilityIds: { 5478: 'keeper_of_the_light_illuminate' },
  abilities: { keeper_of_the_light_illuminate: { dname: 'Illuminate' } },
});

test('resolves hero, item and ability names', () => {
  assert.deepEqual(entityRef(catalog, 'hero', 90), { id: 90, name: 'Keeper of the Light' });
  assert.deepEqual(entityRef(catalog, 'item', 102), { id: 102, name: 'Force Staff' });
  assert.deepEqual(entityRef(catalog, 'ability', 5478), { id: 5478, name: 'Illuminate' });
});

test('preserves an unknown positive id without guessing a name', () => {
  assert.deepEqual(entityRef(catalog, 'item', 999999), { id: 999999, name: null });
  assert.deepEqual(entityRef(catalog, 'hero', null), { id: null, name: null });
});

test('falls through empty preferred names and preserves Valve names', () => {
  const resolved = buildEntityCatalog({
    valve: { items: { force_staff: { id: 102, dname: 'Valve Force Staff' } } },
    heroes: { 1: { id: 1, name: 'npc_dota_hero_antimage', localized_name: '  ', localizedName: 'Anti-Mage' } },
    items: { force_staff: { id: 102, dname: '  ', displayName: 'OpenDota Force Staff' }, blink: { id: 1, dname: '', displayName: 'Blink Dagger' } },
    abilityIds: { 1: 'blink' },
    abilities: { blink: { dname: ' ', name: 'Blink' } },
  });
  assert.deepEqual(entityRef(resolved, 'hero', 1), { id: 1, name: 'Anti-Mage' });
  assert.deepEqual(entityRef(resolved, 'item', 102), { id: 102, name: 'Valve Force Staff' });
  assert.deepEqual(entityRef(resolved, 'item', 1), { id: 1, name: 'Blink Dagger' });
  assert.deepEqual(entityRef(resolved, 'ability', 1), { id: 1, name: 'Blink' });
});

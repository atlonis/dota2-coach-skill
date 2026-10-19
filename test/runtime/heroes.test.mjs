import test from 'node:test';
import assert from 'node:assert/strict';
import { heroIdForName } from '../../dota2-match-coach/scripts/lib/heroes.mjs';

const constants = {
  107: { id: 107, name: 'npc_dota_hero_earth_spirit', localized_name: 'Earth Spirit' },
  90: { id: 90, name: 'npc_dota_hero_keeper_of_the_light', localized_name: 'Keeper of the Light' },
};

test('resolves an exact English or internal hero name to its hero ID', () => {
  assert.equal(heroIdForName('Earth Spirit', constants), 107);
  assert.equal(heroIdForName('keeper of the light', constants), 90);
  assert.equal(heroIdForName('npc_dota_hero_earth_spirit', constants), 107);
});

test('rejects an unknown or empty hero name', () => {
  for (const name of ['Earth', '', '   ']) {
    assert.throws(() => heroIdForName(name, constants), (error) => error?.code === 'hero_not_found');
  }
});

test('rejects a name that two hero records share', () => {
  assert.throws(() => heroIdForName('Earth Spirit', { ...constants, 999: { id: 999, localized_name: 'Earth Spirit' } }),
    (error) => error?.code === 'hero_ambiguous');
});

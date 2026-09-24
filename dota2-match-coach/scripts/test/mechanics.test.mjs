import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMechanics, mechanicsEntityNames, mechanicsRequest, plainText, recipeItemIds, resolveDescription, talentName,
} from '../lib/mechanics.mjs';

function specialValue(name, values, heading = '', extra = {}) {
  return { name, values_float: values, is_percentage: false, heading_loc: heading, bonuses: [], values_shard: [], values_scepter: [], ...extra };
}

function earthSpirit() {
  return {
    id: 107, name: 'npc_dota_hero_earth_spirit', name_loc: 'Earth Spirit', primary_attr: 0, attack_capability: 1,
    str_base: 23, str_gain: 3.8, agi_base: 17, agi_gain: 1.5, int_base: 17, int_gain: 2.1,
    damage_min: 48, damage_max: 52, attack_rate: 1.7, attack_range: 150, movement_speed: 290, armor: 2.8333335, magic_resistance: 25,
    abilities: [
      {
        id: 5608, name: 'earth_spirit_boulder_smash', name_loc: 'Boulder Smash', type: 0, max_level: 4,
        desc_loc: 'Smashes the nearest unit within %rock_search_aoe% range, dealing %rock_damage% damage.',
        cooldowns: [20, 17, 14, 11], mana_costs: [100], cast_ranges: [150], scepter_loc: '', shard_loc: '',
        special_values: [
          specialValue('rock_search_aoe', [200], 'REMNANT SMASH RADIUS:'),
          specialValue('rock_damage', [110, 180, 250, 320], 'DAMAGE:', { bonuses: [{ name: 'special_bonus_unique_earth_spirit_6', value: 80 }] }),
          specialValue('AbilityCooldown', [20, 17, 14, 11], '', { bonuses: [{ name: 'special_bonus_unique_earth_spirit_7', value: -2 }] }),
        ],
      },
      {
        id: 5612, name: 'earth_spirit_stone_caller', name_loc: 'Stone Remnant', type: 0, ability_is_innate: true,
        desc_loc: 'Places a remnant.', cooldowns: [0], mana_costs: [0], cast_ranges: [1100], special_values: [],
      },
      {
        id: 5613, name: 'earth_spirit_magnetize', name_loc: 'Magnetize', type: 1, max_level: 3,
        desc_loc: 'Deals %damage_per_second% damage per second for %damage_duration% seconds.',
        cooldowns: [80, 70, 60], mana_costs: [100], cast_ranges: [0],
        ability_has_scepter: true, scepter_loc: 'Magnetize lasts %bonus_damage_duration% more seconds.',
        special_values: [
          specialValue('damage_per_second', [50, 75, 100], 'DAMAGE PER SECOND:'),
          specialValue('damage_duration', [6], 'DURATION:', { values_scepter: [2] }),
        ],
      },
    ],
    talents: [
      { id: 7662, name: 'special_bonus_unique_earth_spirit_7', name_loc: '-{s:bonus_AbilityCooldown}s Boulder Smash Cooldown', special_values: [] },
      { id: 6640, name: 'special_bonus_unique_earth_spirit_3', name_loc: '+{s:bonus_stun_duration}s Remnant Stun Duration', special_values: [] },
      { id: 6203, name: 'special_bonus_unique_earth_spirit', name_loc: '+{s:value}% Rolling Boulder Damage', special_values: [specialValue('value', [250])] },
    ],
    facets: [],
    facet_abilities: [],
  };
}

function spiritVessel() {
  return {
    id: 267, name: 'item_spirit_vessel', name_loc: 'Spirit Vessel', item_cost: 2725,
    desc_loc: '<h1>Active: Soul Release</h1> Reduces health by %enemy_hp_drain%%% per second. Lasts %duration% seconds.<br><br>Also %missing_value% &amp; more.',
    notes_loc: ['Empty vessels gain 2 charges.', ''],
    cooldowns: [10], mana_costs: [0], cast_ranges: [750],
    special_values: [
      specialValue('bonus_all_stats', [10], '+$all'),
      specialValue('bonus_mana_regen', [1.75], '+$mana_regen'),
      specialValue('enemy_hp_drain', [4]),
      specialValue('duration', [8]),
      specialValue('bonus_new_stat', [5], '+$new_stat', { is_percentage: true }),
    ],
  };
}

function patchNotes() {
  return {
    patch_number: '7.41f', patch_name: '7.41f', success: true,
    general_notes: [{ title: 'Tormentor', generic: [{ indent_level: 1, note: 'Now disjoints projectiles' }] }],
    heroes: [
      {
        hero_id: 107,
        hero_notes: [{ indent_level: 1, note: 'Base Armor increased by 1' }],
        abilities: [{ ability_id: 5608, ability_notes: [{ indent_level: 1, note: 'Damage increased' }, { indent_level: 2, note: 'Per level' }] }],
      },
      { hero_id: 99, hero_notes: [{ indent_level: 1, note: 'Hero outside the match' }] },
    ],
    items: [
      { ability_id: 267, ability_notes: [{ indent_level: 1, note: 'Cost reduced' }, { indent_level: 1, hide_dot: true, note: '<br>' }] },
      { ability_id: 1, ability_notes: [{ indent_level: 1, note: 'Item not bought' }] },
    ],
  };
}

function fetched({ heroes = [earthSpirit(), { ...earthSpirit(), id: 2, name_loc: 'Axe', talents: [] }], items = [spiritVessel()], notes = patchNotes() } = {}) {
  return {
    request: { selectedHeroId: 107, heroIds: [107, 2], itemIds: [267] },
    fetched: {
      status: 'ready', patch: '7.41f',
      heroes: heroes.map((record) => ({ kind: 'hero', id: record.id, status: 'ready', record })),
      items: items.map((record) => ({ kind: 'item', id: record.id, status: 'ready', record })),
      patchNotes: { kind: 'patchNotes', id: '7.41f', status: 'ready', record: notes },
    },
  };
}

test('resolves descriptions as the official pages do and marks a missing value', () => {
  const vessel = spiritVessel();
  assert.deepEqual(resolveDescription(vessel.desc_loc, vessel.special_values), {
    text: 'Active: Soul Release. Reduces health by 4% per second. Lasts 8 seconds. Also (unknown value) & more.',
    unresolved: 1,
  });
  assert.equal(plainText('<b>Bold</b>&nbsp;text <br/>here'), 'Bold text here');
});

test('names talents from their own and their ability bonus values, leaving an unfilled one unknown', () => {
  const hero = earthSpirit();
  assert.deepEqual(hero.talents.map((talent) => talentName(talent, hero)), [
    '-2s Boulder Smash Cooldown', null, '+250% Rolling Boulder Damage',
  ]);
});

test('builds the selected hero in full and the other heroes compactly', () => {
  const mechanics = buildMechanics(fetched());
  const hero = mechanics.selectedHero;

  assert.equal(mechanics.status, 'ready');
  assert.equal(mechanics.source, 'valve_datafeed');
  assert.equal(mechanics.patch, '7.41f');
  assert.deepEqual([hero.hero, hero.primaryAttribute, hero.attackType, hero.armor], [{ id: 107, name: 'Earth Spirit' }, 'strength', 'melee', 2.83]);
  assert.deepEqual(hero.attributes.strength, { base: 23, gain: 3.8 });
  const [smash, remnant, magnetize] = hero.abilities;
  assert.equal(smash.description, 'Smashes the nearest unit within 200 range, dealing 110 / 180 / 250 / 320 damage.');
  assert.deepEqual(smash.values, [{ label: 'Remnant smash radius', value: '200' }, { label: 'Damage', value: '110 / 180 / 250 / 320' }]);
  assert.deepEqual([smash.cooldowns, smash.manaCosts, smash.castRanges, smash.maxLevel], [[20, 17, 14, 11], [100], [150], 4]);
  assert.deepEqual([remnant.kind, remnant.cooldowns, remnant.manaCosts], ['innate', [], []]);
  assert.deepEqual([magnetize.kind, magnetize.scepter, magnetize.shard], ['ultimate', 'Magnetize lasts 2 more seconds.', null]);
  assert.deepEqual(hero.talents.map((row) => row.ability.name), ['-2s Boulder Smash Cooldown', null, '+250% Rolling Boulder Damage']);
  assert.equal(mechanics.heroes.length, 1);
  assert.equal(Object.hasOwn(mechanics.heroes[0].abilities[0], 'values'), false);
  assert.equal(mechanics.heroes[0].abilities[0].description, smash.description);
});

test('builds purchased items with stats, notes and costs', () => {
  const [vessel] = buildMechanics(fetched()).items;
  assert.deepEqual(vessel.item, { id: 267, name: 'Spirit Vessel' });
  assert.equal(vessel.cost, 2725);
  assert.deepEqual(vessel.stats, [
    { label: 'All Attributes', value: '+10' },
    { label: 'Mana Regeneration', value: '+1.75' },
    { label: 'new stat', value: '+5%' },
  ]);
  assert.deepEqual(vessel.notes, ['Empty vessels gain 2 charges.']);
  assert.deepEqual([vessel.cooldowns, vessel.manaCosts, vessel.castRanges], [[10], [], [750]]);
});

test('keeps only current sub-patch notes that touch the match heroes and bought items', () => {
  const notes = buildMechanics(fetched()).patchNotes;
  assert.equal(notes.version, '7.41f');
  assert.deepEqual(notes.general, [{ title: 'Tormentor', notes: [{ text: 'Now disjoints projectiles', level: 1 }] }]);
  assert.deepEqual(notes.heroes.map((entry) => entry.hero.id), [107]);
  assert.deepEqual(notes.heroes[0].abilities, [{
    ability: { id: 5608, name: 'Boulder Smash' },
    notes: [{ text: 'Damage increased', level: 1 }, { text: 'Per level', level: 2 }],
  }]);
  assert.deepEqual(notes.items, [{ item: { id: 267, name: 'Spirit Vessel' }, notes: [{ text: 'Cost reduced', level: 1 }] }]);
});

test('reports partial mechanics and refuses them without the selected hero', () => {
  const input = fetched();
  input.fetched.heroes[1] = { kind: 'hero', id: 2, status: 'failed', error: { code: 'timeout' } };
  input.fetched.patchNotes = { kind: 'patchNotes', id: '7.41f', status: 'failed', error: { code: 'http' } };
  const partial = buildMechanics(input);
  assert.equal(partial.status, 'partial');
  assert.deepEqual(partial.unavailable, [{ kind: 'hero', id: 2, reason: 'timeout' }, { kind: 'patch_notes', id: '7.41f', reason: 'http' }]);
  assert.equal(partial.patchNotes, null);

  input.fetched.heroes[0] = { kind: 'hero', id: 107, status: 'failed', error: { code: 'http' } };
  const missing = buildMechanics(input);
  assert.deepEqual([missing.status, missing.reason, missing.selectedHero], ['unavailable', 'selected_hero_unavailable', null]);
  assert.deepEqual([buildMechanics(undefined).reason, buildMechanics({ reason: 'hero_unknown' }).reason], ['not_requested', 'hero_unknown']);
});

test('requests every match hero with the selected hero first and bought items without recipes', () => {
  const model = {
    player: { heroId: { value: 107 } },
    participants: [{ hero: { id: 5 } }, { hero: { id: 107 } }, { hero: { id: null } }, { hero: { id: 5 } }],
    items: { purchases: [
      { item: { id: 266 } }, { item: { id: 267 } }, { item: { id: 42 } }, { item: { id: 267 } }, { item: { id: null } },
      ...Array.from({ length: 40 }, (_, index) => ({ item: { id: 1000 + index } })),
    ] },
  };
  const recipes = recipeItemIds({ recipe_spirit_vessel: { id: 266 }, spirit_vessel: { id: 267 } });

  const request = mechanicsRequest(model, { recipeItemIds: recipes });

  assert.deepEqual(request.heroIds, [107, 5]);
  assert.deepEqual(request.itemIds.slice(0, 3), [267, 42, 1000]);
  assert.equal(request.itemIds.length, 30);
  assert.equal(mechanicsRequest({ player: { heroId: { value: null } } }).selectedHeroId, null);
});

test('exposes datafeed display names for the entity catalog', () => {
  const names = mechanicsEntityNames(fetched());
  assert.deepEqual(names.heroes[107], { id: 107, name: 'Earth Spirit' });
  assert.deepEqual(names.abilities[5613], { id: 5613, name: 'Magnetize' });
  assert.deepEqual(names.abilities[7662], { id: 7662, name: '-2s Boulder Smash Cooldown' });
  assert.equal(Object.hasOwn(names.abilities, 6640), false);
  assert.deepEqual(names.items[267], { id: 267, name: 'Spirit Vessel' });
});

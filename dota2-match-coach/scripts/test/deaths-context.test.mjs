import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeathContexts, latestPositionAt } from '../lib/deaths.mjs';
import { playback, stratzPlayer } from './fixtures.mjs';

test('uses the nearest position at or before death only within three seconds', () => {
  const points = [{ time: 95, x: 1, y: 1 }, { time: 98, x: 4, y: 5 }, { time: 101, x: 9, y: 9 }];

  assert.deepEqual(latestPositionAt(points, 100), { time: 98, x: 4, y: 5, ageSeconds: 2 });
  assert.equal(latestPositionAt([{ time: 96, x: 1, y: 1 }], 100), null);
});

test('builds one context per valid timed death and clips own events to the inclusive window', () => {
  const selected = stratzPlayer({
    accountId: 10,
    heroId: 90,
    radiant: true,
    playbackData: playback({
      deaths: [{ time: 100, attacker: 6, byAbility: 5478, byItem: 102, timeDead: 30 }, { time: 1801 }],
      abilities: [{ time: 84, abilityId: 1 }, { time: 85, abilityId: 2 }, { time: 105, abilityId: 3 }, { time: 106, abilityId: 4 }],
      items: [{ time: 85, itemId: 102 }, { time: 105, itemId: 254 }],
      positions: [{ time: 98, x: 40, y: 40 }],
    }),
  });

  const result = buildDeathContexts({
    selectedAccountId: 10,
    participants: [{ slot: 0, accountId: 10, hero: { id: 90, name: 'Keeper of the Light' }, side: 'radiant', playbackAvailable: true }],
    stratzPlayers: [selected],
    teamfights: [],
    selectedRepositions: [],
    durationSeconds: 1800,
    catalog: { hero: { 6: 'Enemy' }, item: { 102: 'Force Staff', 254: 'Glimmer Cape' }, ability: { 5478: 'Illuminate' } },
    scoreboardDeaths: 3,
  });

  assert.equal(result.contexts.length, 1);
  assert.deepEqual(result.contexts[0].ownAbilityUses.map((event) => event.time), [85, 105]);
  assert.deepEqual(result.contexts[0].ownItemUses.map((event) => event.time), [85, 105]);
  assert.deepEqual(result.contexts[0].killerHero, { id: 6, name: 'Enemy' });
  assert.deepEqual(result.contexts[0].killingAbility, { id: 5478, name: 'Illuminate' });
  assert.deepEqual(result.contexts[0].killingItem, { id: 102, name: 'Force Staff' });
  assert.equal(result.unresolvedCount, 2);
});

test('marks unavailable evidence while keeping an explicit null context shape', () => {
  const result = buildDeathContexts({
    selectedAccountId: 10,
    participants: [{ slot: 0, accountId: 10, hero: { id: 90, name: 'Keeper of the Light' }, side: 'radiant', playbackAvailable: true }],
    stratzPlayers: [stratzPlayer({ accountId: 10, heroId: 90, radiant: true, playbackData: { deathEvents: [{ time: 100 }] } })],
    teamfights: null,
    selectedRepositions: null,
    durationSeconds: 1800,
    catalog: { hero: {}, item: {}, ability: {} },
  });

  assert.deepEqual(result.contexts[0].teamfight, { inFight: null, start: null, end: null });
  assert.equal(result.contexts[0].position, null);
  assert.equal(result.contexts[0].timeDead, null);
  assert.deepEqual(result.contexts[0].observations, {
    isolated: null,
    afterConfirmedTeleport: null,
    firstAlliedDeathInFight: null,
    tradedLocally: null,
    ownDefensiveItemUsed: null,
    contextIncomplete: true,
  });
  assert.deepEqual(result.contexts[0].unavailable, [
    'death_position_unavailable',
    'death_time_dead_unavailable',
    'teamfights_unavailable',
    'selected_ability_uses_unavailable',
    'selected_item_uses_unavailable',
    'selected_repositions_unavailable',
    'selected_kills_unavailable',
  ]);
});

test('uses a supplied valid teamfight timeline to distinguish inside and outside deaths', () => {
  const result = buildDeathContexts({
    selectedAccountId: 10,
    participants: [{ slot: 0, accountId: 10, hero: { id: 90, name: 'Keeper of the Light' }, side: 'radiant', playbackAvailable: true }],
    stratzPlayers: [stratzPlayer({ accountId: 10, heroId: 90, radiant: true, playbackData: playback({ deaths: [{ time: 100 }, { time: 130 }] }) })],
    teamfights: [{ start: 90, end: 110 }],
    selectedRepositions: [],
    durationSeconds: 1800,
    catalog: { hero: {}, item: {}, ability: {} },
  });

  assert.deepEqual(result.contexts.map((context) => context.teamfight), [
    { inFight: true, start: 90, end: 110 },
    { inFight: false, start: null, end: null },
  ]);
});

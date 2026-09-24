import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBuybacks, buildObjectives, buildSkillBuild, buildTeamEconomy, buildWards } from '../lib/match-context.mjs';
import { buildEntityCatalog } from '../lib/entities.mjs';
import { normalizeParticipants } from '../lib/lane.mjs';

const SLOTS = [0, 1, 2, 3, 4, 128, 129, 130, 131, 132];
const HEROES = [107, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PHASES = [
  { id: 'lane', start: 0, end: 600, interval: '0–10' },
  { id: 'transition', start: 600, end: 900, interval: '10–15' },
];

function ticks(first, last) {
  const times = [];
  for (let second = first; second <= last; second += 60) times.push(second);
  return times;
}

function openPlayers(extra = () => ({})) {
  return SLOTS.map((slot, index) => ({
    player_slot: slot, account_id: 100 + index, hero_id: HEROES[index], times: ticks(0, 900), ...extra(index, slot),
  }));
}

function participantsFor(players) {
  const heroes = Object.fromEntries(HEROES.map((id) => [id, { id, name: id === 107 ? 'npc_dota_hero_earth_spirit' : `npc_dota_hero_${id}`, localized_name: id === 107 ? 'Earth Spirit' : `Hero ${id}` }]));
  return { participants: normalizeParticipants({ openPlayers: players, catalog: buildEntityCatalog({ heroes }) }), heroes };
}

test('reads team gold and XP difference by recorded minute from the selected side', () => {
  const players = openPlayers(() => ({ times: ticks(120, 900) }));
  const advantage = ticks(120, 900).map((second) => (second / 60) * 100);
  const match = { players, radiant_gold_adv: advantage, radiant_xp_adv: advantage.map((value) => value * 2) };

  const radiant = buildTeamEconomy({ match, side: 'radiant', durationSeconds: 900, phases: PHASES });
  const dire = buildTeamEconomy({ match, side: 'dire', durationSeconds: 900, phases: PHASES });

  assert.equal(radiant.status, 'ready');
  assert.deepEqual(radiant.measures.earnedGold.values.slice(0, 4), [null, null, 200, 300]);
  assert.equal(dire.measures.earnedGold.values[10], -1000);
  assert.equal(dire.perspective, 'dire');
  assert.deepEqual(radiant.phases[0].earnedGold, { startMinute: 0, endMinute: 10, start: null, end: 1000, change: null });
  assert.deepEqual(radiant.phases[1].xp, { startMinute: 10, endMinute: 15, start: 2000, end: 3000, change: 1000 });
  assert.equal(Object.hasOwn(radiant.measures, 'netWorth'), false);
});

test('reports extremes, leader changes and the largest five-minute swings without a cause', () => {
  const values = [0, 500, 1500, 3000, 4100, 3000, 1000, -500, -2300, -1800, -900, 400];
  const players = openPlayers(() => ({ times: ticks(0, 660) }));
  const economy = buildTeamEconomy({ match: { players, radiant_gold_adv: values, radiant_xp_adv: values }, side: 'radiant', durationSeconds: 700 });

  assert.deepEqual(economy.extremes.earnedGold, { maxLead: { minute: 4, value: 4100 }, maxDeficit: { minute: 8, value: -2300 } });
  assert.deepEqual(economy.leadChanges.earnedGold, [{ minute: 7, ahead: 'opponent_side' }, { minute: 11, ahead: 'selected_side' }]);
  assert.deepEqual(economy.largestSwings.earnedGold.adverse, { startMinute: 4, endMinute: 8, start: 4100, end: -2300, change: -6400 });
  assert.deepEqual(economy.largestSwings.earnedGold.favorable, { startMinute: 0, endMinute: 4, start: 0, end: 4100, change: 4100 });
  assert.equal(economy.swingWindowMinutes, 5);
});

test('adds team net worth only when every participant recorded it', () => {
  const players = openPlayers((index) => ({ networth_t: ticks(0, 900).map((second) => (index < 5 ? 110 : 100) * (second / 60)) }));
  const match = { players, radiant_gold_adv: ticks(0, 900).map(() => 0), radiant_xp_adv: ticks(0, 900).map(() => 0) };

  const economy = buildTeamEconomy({ match, side: 'dire', durationSeconds: 900 });
  assert.equal(economy.measures.netWorth.values[10], -500);

  players[9].networth_t = [];
  assert.equal(Object.hasOwn(buildTeamEconomy({ match, side: 'dire', durationSeconds: 900 }).measures, 'netWorth'), false);
});

test('keeps team economy unavailable instead of guessing its timing or perspective', () => {
  const advantage = ticks(0, 900).map(() => 100);
  assert.equal(buildTeamEconomy({ match: { players: openPlayers(), radiant_gold_adv: advantage }, side: null }).reason, 'side_unknown');
  assert.equal(buildTeamEconomy({ match: { players: openPlayers() }, side: 'radiant' }).reason, 'series_unavailable');
  const untimed = openPlayers(() => ({ times: undefined }));
  assert.equal(buildTeamEconomy({ match: { players: untimed, radiant_gold_adv: advantage }, side: 'radiant' }).reason, 'sample_times_unavailable');
  const short = buildTeamEconomy({ match: { players: openPlayers(), radiant_gold_adv: advantage.slice(1) }, side: 'radiant' });
  assert.equal(short.status, 'unavailable');
  assert.equal(short.reason, 'sample_times_inconsistent');
});

test('normalizes recorded objectives with the side, the last hit and the selected player', () => {
  const players = openPlayers();
  const { participants, heroes } = participantsFor(players);
  const match = {
    players,
    objectives: [
      { time: 104, type: 'CHAT_MESSAGE_FIRSTBLOOD', slot: 2, key: 9, player_slot: 2 },
      { time: 651, type: 'building_kill', unit: 'npc_dota_hero_earth_spirit', key: 'npc_dota_badguys_tower1_mid', slot: 0, player_slot: 0 },
      { time: 700, type: 'building_kill', unit: 'npc_dota_creep_badguys_ranged', key: 'npc_dota_badguys_tower1_bot' },
      { time: 900, type: 'building_kill', unit: 'npc_dota_goodguys_siege_upgraded', key: 'npc_dota_badguys_range_rax_bot' },
      { time: 1331, type: 'CHAT_MESSAGE_ROSHAN_KILL', team: 3 },
      { time: 1331, type: 'CHAT_MESSAGE_AEGIS', slot: 5, player_slot: 128 },
      { time: 1353, type: 'CHAT_MESSAGE_COURIER_LOST', value: 95, killer: -1, team: 2 },
      { time: 1400, type: 'building_kill', unit: 'npc_dota_hero_8', key: 'npc_dota_goodguys_tower4' },
      { time: 1500, type: 'building_kill', unit: 'npc_dota_hero_8', key: 'npc_dota_goodguys_fort' },
      { time: 1400, type: 'CHAT_MESSAGE_UNKNOWN_EVENT' },
      { time: 395, type: 'CHAT_MESSAGE_COURIER_LOST', value: 0, killer: 3, team: -1 },
      { time: 99999, type: 'CHAT_MESSAGE_ROSHAN_KILL', team: 2 },
    ],
  };

  const result = buildObjectives({ match, participants, selectedAccountId: 100, selectedSide: 'radiant', heroConstants: heroes, durationSeconds: 1600 });

  assert.equal(result.status, 'ready');
  assert.equal(result.unrecognizedCount, 3);
  const [firstBlood, mid, bot, rax, roshan, aegis, courier, tier4, ancient] = result.events;
  assert.deepEqual(firstBlood.killer.hero, { id: 3, name: 'Hero 3' });
  assert.deepEqual(firstBlood.victim, { hero: { id: 10, name: 'Hero 10' }, side: 'dire', selectedPlayer: false });
  assert.deepEqual(mid.building, { side: 'dire', kind: 'tower', tier: 1, lane: 'mid', barracks: null });
  assert.deepEqual([mid.killer.kind, mid.killer.selectedPlayer, mid.denied, mid.ownBuilding], ['hero', true, false, false]);
  assert.deepEqual([bot.killer.kind, bot.killer.side, bot.denied], ['non_hero', 'dire', true]);
  assert.deepEqual(rax.building, { side: 'dire', kind: 'barracks', tier: null, lane: 'bottom', barracks: 'ranged' });
  assert.deepEqual([rax.killer.side, rax.denied], ['radiant', false]);
  assert.deepEqual([roshan.type, roshan.team, roshan.bySelectedSide], ['roshan_killed', 'dire', false]);
  assert.deepEqual([aegis.type, aegis.participant.hero.id, aegis.bySelectedSide], ['aegis_picked_up', 6, false]);
  assert.deepEqual([courier.lostBy, courier.lostBySelectedSide, courier.killer], ['radiant', true, null]);
  assert.deepEqual([tier4.building.tier, tier4.building.lane, tier4.ownBuilding, tier4.killer.hero.id], [4, null, true, 8]);
  assert.equal(ancient.building.kind, 'ancient');
});

test('keeps objectives unavailable when the parse has no objective log', () => {
  const result = buildObjectives({ match: { players: openPlayers() }, participants: [], selectedAccountId: 100, selectedSide: 'radiant' });
  assert.deepEqual([result.status, result.reason, result.events.length], ['unavailable', 'objectives_unavailable', 0]);
});

test('records ward placements with the time each ward left, and excludes untimed placements', () => {
  const players = openPlayers((index) => ({
    obs_log: index === 0 ? [
      { time: -817, ehandle: 1 }, { time: 314, ehandle: 2 }, { time: 865, ehandle: 3 },
    ] : [{ time: 100, ehandle: 50 + index }],
    obs_left_log: index === 0 ? [{ time: 303, ehandle: 1 }, { time: 674, ehandle: 2, attackername: 'npc_dota_hero_ogre_magi' }] : [],
    sen_log: index === 0 ? [{ time: 117, ehandle: 4 }] : [],
    sen_left_log: index === 0 ? [{ time: 474, ehandle: 4 }] : [],
  }));
  const wards = buildWards({ match: { players }, selectedOpenPlayer: players[0], selectedSide: 'radiant', durationSeconds: 900 });

  assert.deepEqual(wards.selectedPlayer.placements, [
    { time: 117, kind: 'sentry', endedAt: 474, secondsActive: 357 },
    { time: 314, kind: 'observer', endedAt: 674, secondsActive: 360 },
    { time: 865, kind: 'observer', endedAt: null, secondsActive: null },
  ]);
  assert.deepEqual([wards.selectedPlayer.observerCount, wards.selectedPlayer.sentryCount, wards.selectedPlayer.excludedCount], [2, 1, 1]);
  assert.deepEqual(wards.teams, { selectedSide: { observer: 6, sentry: 1 }, opponentSide: { observer: 5, sentry: 0 } });

  delete players[7].sen_log;
  const partial = buildWards({ match: { players }, selectedOpenPlayer: players[0], selectedSide: 'radiant', durationSeconds: 900 });
  assert.equal(partial.teams.opponentSide, null);
  assert.equal(buildWards({ match: { players }, selectedOpenPlayer: players[7], selectedSide: 'dire' }).status, 'unavailable');
});

test('records buybacks for the selected player and complete sides only', () => {
  const players = openPlayers((index) => ({ buyback_log: index === 2 || index === 7 ? [{ time: 2580, slot: index }] : [] }));
  const result = buildBuybacks({ match: { players }, selectedOpenPlayer: players[2], selectedSide: 'radiant', durationSeconds: 2846 });
  assert.deepEqual(result.selectedPlayer, [{ time: 2580 }]);
  assert.deepEqual([result.selectedSideCount, result.opponentSideCount], [1, 1]);

  delete players[9].buyback_log;
  assert.equal(buildBuybacks({ match: { players }, selectedOpenPlayer: players[2], selectedSide: 'radiant' }).opponentSideCount, null);
  assert.equal(buildBuybacks({ match: { players }, selectedOpenPlayer: players[9], selectedSide: 'dire' }).status, 'unavailable');
});

test('names the recorded upgrade order and leaves a templated talent name unknown', () => {
  const catalog = buildEntityCatalog({
    abilityIds: { 5608: 'earth_spirit_boulder_smash', 6640: 'special_bonus_unique_earth_spirit_3' },
    abilities: {
      earth_spirit_boulder_smash: { dname: 'Boulder Smash' },
      special_bonus_unique_earth_spirit_3: { dname: '+{s:bonus_stun_duration}s Boulder Smash Remnant Stun Duration' },
    },
  });
  const result = buildSkillBuild({ selectedOpenPlayer: { ability_upgrades_arr: [5608, 6640] }, catalog });

  assert.deepEqual(result.upgrades, [
    { order: 1, ability: { id: 5608, name: 'Boulder Smash' } },
    { order: 2, ability: { id: 6640, name: null } },
  ]);
  assert.equal(buildSkillBuild({ selectedOpenPlayer: {}, catalog }).status, 'unavailable');
});

test('matches a reused ward handle to the exit that follows each placement', () => {
  const player = {
    player_slot: 0,
    obs_log: [{ time: 600, ehandle: 9 }, { time: 100, ehandle: 9 }],
    obs_left_log: [{ time: 700, ehandle: 9 }, { time: 460, ehandle: 9 }],
    sen_log: [],
    sen_left_log: [],
  };
  const wards = buildWards({ match: { players: [player] }, selectedOpenPlayer: player, selectedSide: 'radiant', durationSeconds: 900 });
  assert.deepEqual(wards.selectedPlayer.placements.map((row) => [row.time, row.endedAt]), [[100, 460], [600, 700]]);
  assert.deepEqual(wards.teams, { selectedSide: null, opponentSide: null });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { projectArtifact, renderEvidenceMarkdown, writeArtifacts } from '../lib/report.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';

function v2Model() {
  const model = normalizeEvidence(fullMatchFixture());
  model.sources.entityConstants = { status: 'ready' };
  model.deathAnalysis.contexts[0].observations.isolated = null;
  model.deathAnalysis.contexts[0].unavailable.push('participant_positions');
  return model;
}

test('projectArtifact preserves the v2 tactical facts and capability values verbatim', () => {
  const model = v2Model();
  model.dataQuality.capabilities.deathPattern = false;

  const artifact = projectArtifact(model);

  assert.equal(artifact.schemaVersion, '2.1.0');
  assert.deepEqual(Object.keys(artifact.sources).sort(), ['entityConstants', 'opendota', 'stratz', 'valve']);
  assert.equal(artifact.player.heroName.value, 'Keeper of the Light');
  assert.equal(artifact.participants.length, 10);
  assert.deepEqual(artifact.participants[0].hero, { id: 90, name: 'Keeper of the Light' });
  assert.equal(artifact.lane.selectedLane, 'bottom');
  assert.equal(artifact.lane.opponents.length, 2);
  assert.ok(artifact.lane.opponents.every((opponent) => opponent.lane === 'bottom'));
  assert.equal(artifact.deathAnalysis.contexts[0].observations.isolated, null);
  assert.ok(artifact.deathAnalysis.contexts[0].unavailable.includes('participant_positions'));
  assert.deepEqual(artifact.deathAnalysis.patterns, model.deathAnalysis.patterns);
  assert.equal(artifact.deathAnalysis.priorityDeathTime, model.deathAnalysis.priorityDeathTime);
  assert.equal(artifact.deathAnalysis.unresolvedCount, model.deathAnalysis.unresolvedCount);
  assert.deepEqual(artifact.dataQuality.capabilities, model.dataQuality.capabilities);
  assert.equal(Object.hasOwn(artifact.dataQuality, 'gates'), false);
});

test('normalization resolves reportable entity refs and keeps unknown IDs unnamed', () => {
  const input = fullMatchFixture();
  input.openDota.match.players[0].purchase_log.push({ time: 301, item_id: 999 });
  input.openDota.match.players[0].purchase_log.push({ time: 302, key: 'force_staff' });
  input.stratz.match.players[0].playbackData.abilityUsedEvents.push({ time: 596, abilityId: 999 });
  const model = normalizeEvidence(input);
  const context = model.deathAnalysis.contexts[0];
  const artifact = projectArtifact(model);
  const projectedContext = artifact.deathAnalysis.contexts[0];

  assert.deepEqual(model.items.purchases[0].item, { id: 102, name: 'Force Staff' });
  assert.deepEqual(model.items.purchases[1].item, { id: 999, name: null });
  assert.deepEqual(model.items.purchases[2].item, { id: 102, name: 'Force Staff' });
  assert.deepEqual(model.items.finalInventory[0].value, { id: 102, name: 'Force Staff' });
  assert.deepEqual(context.ownAbilityUses[0].ability, { id: 5478, name: 'Illuminate' });
  assert.deepEqual(context.ownAbilityUses.at(-1).ability, { id: 999, name: null });
  assert.deepEqual(context.ownItemUses[0].item, { id: 46, name: 'Town Portal Scroll' });
  assert.deepEqual(context.recentReposition.causeItem, { id: 46, name: 'Town Portal Scroll' });
  assert.deepEqual(artifact.items.purchases[0].item, { id: 102, name: 'Force Staff' });
  assert.deepEqual(artifact.items.purchases[1].item, { id: 999, name: null });
  assert.deepEqual(artifact.items.purchases[2].item, { id: 102, name: 'Force Staff' });
  assert.deepEqual(artifact.items.finalInventory[0].value, { id: 102, name: 'Force Staff' });
  assert.deepEqual(projectedContext.ownAbilityUses[0].ability, { id: 5478, name: 'Illuminate' });
  assert.deepEqual(projectedContext.ownAbilityUses.at(-1).ability, { id: 999, name: null });
  assert.deepEqual(projectedContext.ownItemUses[0].item, { id: 46, name: 'Town Portal Scroll' });
  assert.deepEqual(projectedContext.recentReposition.causeItem, { id: 46, name: 'Town Portal Scroll' });

  const abilityCauseInput = fullMatchFixture();
  abilityCauseInput.entityConstants.abilityIds[842] = 'fixture_ally_warp';
  abilityCauseInput.entityConstants.abilities.fixture_ally_warp = { dname: 'Ally Warp' };
  abilityCauseInput.stratz.match.players[0].playbackData.abilityUsedEvents.push({ time: 588, abilityId: 842 });
  const abilityCause = projectArtifact(normalizeEvidence(abilityCauseInput)).deathAnalysis.contexts[0].recentReposition;
  assert.deepEqual(abilityCause.causeAbility, { id: 842, name: 'Ally Warp' });
});

test('projectArtifact preserves malformed nullable observations instead of coercing them', () => {
  const model = v2Model();
  model.participants[0].playbackAvailable = null;
  model.participants[0].sourceConflict = null;
  model.deathAnalysis.patterns[0].count = null;
  model.deathAnalysis.unresolvedCount = null;

  const artifact = projectArtifact(model);

  assert.equal(artifact.participants[0].playbackAvailable, null);
  assert.equal(artifact.participants[0].sourceConflict, null);
  assert.equal(artifact.deathAnalysis.patterns[0].count, null);
  assert.equal(artifact.deathAnalysis.unresolvedCount, null);
});

test('writeArtifacts serializes only the projectArtifact output', async () => {
  const model = v2Model();
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'dota-report-v2-'));
  try {
    const expected = projectArtifact(model);
    const { jsonPath } = await writeArtifacts(model, outputDir);
    const written = JSON.parse(await readFile(jsonPath, 'utf8'));
    assert.deepEqual(written, expected);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test('artifact retains metric sample sizes without serializing arbitrary baseline fields', () => {
  const model = v2Model();
  model.baseline.sameHeroPositionRankPatch.points[0].metricSampleSizes = { cs: 201, xp: 500, secret: 'do-not-export' };
  const point = projectArtifact(model).baseline.sameHeroPositionRankPatch.points[0];
  assert.deepEqual(point.metricSampleSizes, { cs: 201, xp: 500 });
});

test('progress evidence survives projection and reports actual per-metric samples', () => {
  const model = v2Model();
  model.progress = {
    status: 'ready', reason: null, eligibleMatchCount: 3, excludedMatchCount: 1, minimumPriorMatches: 2,
    comparisons: [{ metric: 'lh', minute: 10, current: 50, mean: 40, delta: 10, matchCount: 2, source: 'opendota', raw: 'do-not-export' }],
    deathObservations: [{ observation: 'isolated', currentCount: 2, currentDeaths: 3, priorCount: 1, priorDeaths: 6, priorMatchCount: 2, currentShare: 2/3, priorMeanShare: 1/6 }],
    history: [{ matchId: 111, startTime: 1000, raw: 'do-not-export' }],
    limitations: ['descriptive_only', 'no_causal_inference'],
    historyLoad: { status: 'ready', reason: null, skippedFileCount: 1, truncated: false, path: 'do-not-export' },
    raw: 'do-not-export',
  };
  const artifact = projectArtifact(model);
  assert.equal(artifact.progress.comparisons[0].matchCount, 2);
  assert.equal(artifact.progress.comparisons[0].mean, 40);
  assert.equal(artifact.progress.deathObservations[0].priorMatchCount, 2);
  assert.deepEqual(artifact.progress.history, [{ matchId: 111, startTime: 1000 }]);
  assert.doesNotMatch(JSON.stringify(artifact), /do-not-export/);
  const markdown = renderEvidenceMarkdown(artifact);
  assert.match(markdown, /Personal progress/);
  assert.match(markdown, /\| lh \| 10:00 \| 50 \| 40 \| 10 \| 2 \|/);
  assert.match(markdown, /descriptive_only/);
});

test('evidence Markdown inventories names, unavailable observations, and compact death evidence without legacy gates', () => {
  const markdown = renderEvidenceMarkdown(projectArtifact(v2Model()));

  assert.match(markdown, /## Request and sources/);
  assert.match(markdown, /## Match and selected player/);
  assert.match(markdown, /## Participants and actual lane opponents/);
  assert.match(markdown, /## Phases and baseline/);
  assert.match(markdown, /## Death contexts/);
  assert.match(markdown, /## Death patterns and priority time/);
  assert.match(markdown, /## Capabilities, missing, and warnings/);
  assert.match(markdown, /Keeper of the Light/);
  assert.match(markdown, /participant_positions/);
  assert.match(markdown, /nearby allies: none; nearby enemies: Hero 6, Hero 7/);
  assert.match(markdown, /own abilities: Illuminate @ 9:55/);
  assert.match(markdown, /own items: Town Portal Scroll @ 9:48, Force Staff @ 9:58/);
  assert.match(markdown, /recent reposition: teleport_item @ 9:50 \(item: Town Portal Scroll\)/);
  assert.match(markdown, /nearby deaths: none; nearby kills: none/);
  assert.doesNotMatch(markdown, /opponentHeroIds|event_ready|draft_ready/);
});

test('projects the net worth series and how each series established its minutes', () => {
  const input = fullMatchFixture();
  input.openDota.match.players[0].networth_t = [0, 320, 640];
  input.openDota.match.players[0].times = [0, 60, 120];
  input.openDota.match.players[0].gold_t = [0, 300, 600];
  input.openDota.match.players[0].xp_t = [0, 400, 800];
  input.openDota.match.players[0].lh_t = [0, 5, 10];
  input.openDota.match.players[0].dn_t = [0, 0, 1];
  input.openDota.match.players[0].hero_damage_t = [0, 200, 400];

  const artifact = projectArtifact(normalizeEvidence(input));

  assert.deepEqual(artifact.series.netWorth, { source: 'opendota', minuteBasis: 'recorded_times', values: [0, 320, 640] });
  assert.equal(artifact.series.gold.minuteBasis, 'recorded_times');
});

function withMatchContext(input = fullMatchFixture()) {
  const players = input.openDota.match.players;
  const times = Array.from({ length: 31 }, (_, minute) => minute * 60);
  players.forEach((player, index) => {
    player.times = times;
    player.obs_log = index === 0 ? [{ time: 314, ehandle: 7, x: 140, y: 106 }] : [];
    player.obs_left_log = index === 0 ? [{ time: 674, ehandle: 7, attackername: 'npc_dota_hero_ogre_magi' }] : [];
    player.sen_log = [];
    player.sen_left_log = [];
    player.buyback_log = index === 0 ? [{ time: 1500, slot: 0, player_slot: 0 }] : [];
  });
  players[0].ability_upgrades_arr = [5478, 5478];
  Object.assign(input.openDota.match, {
    radiant_gold_adv: times.map((second) => second * 2),
    radiant_xp_adv: times.map((second) => second * 3),
    objectives: [
      { time: 651, type: 'building_kill', unit: 'npc_dota_hero_6', key: 'npc_dota_goodguys_tower1_bot', player_slot: 128 },
      { time: 1331, type: 'CHAT_MESSAGE_ROSHAN_KILL', team: 3, rawText: 'leak-token' },
    ],
  });
  return input;
}

test('projects match context sections through their allowlists', () => {
  const model = normalizeEvidence(withMatchContext());
  model.objectives.events[0].rawUnit = 'leak-token';
  model.wards.selectedPlayer.placements[0].attackername = 'leak-token';

  const artifact = projectArtifact(model);
  const json = JSON.stringify(artifact);

  assert.equal(artifact.teamEconomy.status, 'ready');
  assert.equal(artifact.teamEconomy.perspective, 'radiant');
  assert.equal(artifact.teamEconomy.measures.earnedGold.values[10], 1200);
  assert.deepEqual(artifact.teamEconomy.phases[1].xp, { startMinute: 10, endMinute: 15, start: 1800, end: 2700, change: 900 });
  assert.deepEqual(artifact.objectives.events.map((event) => event.type), ['building_destroyed', 'roshan_killed']);
  assert.deepEqual(artifact.objectives.events[0].killer, { kind: 'hero', hero: { id: 6, name: 'Hero 6' }, side: 'dire', selectedPlayer: false });
  assert.deepEqual(artifact.wards.selectedPlayer.placements, [{ time: 314, kind: 'observer', endedAt: 674, secondsActive: 360 }]);
  assert.deepEqual(artifact.buybacks.selectedPlayer, [{ time: 1500 }]);
  assert.deepEqual(artifact.skillBuild.upgrades[0], { order: 1, ability: { id: 5478, name: 'Illuminate' } });
  assert.equal(artifact.dataQuality.capabilities.teamEconomy, true);
  assert.equal(artifact.dataQuality.capabilities.objectiveTimeline, true);
  assert.doesNotMatch(json, /leak-token|attackername|ehandle|"x":140/);
});

test('renders match context in the evidence inventory without implying causes', () => {
  const markdown = renderEvidenceMarkdown(projectArtifact(normalizeEvidence(withMatchContext())));

  for (const heading of ['## Team economy', '## Objectives', '## Wards, buybacks, and skill build']) assert.match(markdown, new RegExp(heading));
  assert.match(markdown, /it does not identify a cause/);
  assert.match(markdown, /bottom tier 1 tower; last hit: Hero 6, dire/);
  assert.match(markdown, /1\. Illuminate; 2\. Illuminate/);
  assert.match(markdown, /\| 5:14 \| observer \| 11:14 \| 360 \|/);
});

test('shows unavailable match context without empty-looking tables', () => {
  const markdown = renderEvidenceMarkdown(projectArtifact(normalizeEvidence(fullMatchFixture())));
  assert.match(markdown, /## Team economy\n\n\| Field \| Value \|\n\| --- \| --- \|\n\| status \| unavailable \|\n\| reason \| series_unavailable \|/);
  assert.match(markdown, /\| ward logs \| unavailable \(ward_logs_unavailable\) \|/);
});

function mechanicsInput() {
  const hero = {
    id: 90, name_loc: 'Keeper of the Light', primary_attr: 2, attack_capability: 2, attack_range: 600, lore_loc: 'leak-token',
    abilities: [{
      id: 5478, name_loc: 'Illuminate', type: 0, max_level: 4, desc_loc: 'Deals %damage% damage.', cooldowns: [10], mana_costs: [150], cast_ranges: [1800],
      special_values: [{ name: 'damage', values_float: [100, 150], heading_loc: 'DAMAGE:', values_shard: [], values_scepter: [] }],
    }],
    talents: [],
  };
  const item = { id: 102, name_loc: 'Force Staff', item_cost: 2200, desc_loc: '<h1>Active: Force</h1> Pushes a unit.', cooldowns: [19], mana_costs: [100], cast_ranges: [550], special_values: [], notes_loc: [] };
  return {
    request: { selectedHeroId: 90, heroIds: [90], itemIds: [102] },
    fetched: {
      status: 'ready', patch: 'test-current-subpatch',
      heroes: [{ kind: 'hero', id: 90, status: 'ready', record: hero }],
      items: [{ kind: 'item', id: 102, status: 'ready', record: item }],
      patchNotes: { kind: 'patchNotes', id: 'test-current-subpatch', status: 'ready', record: { patch_number: 'test-current-subpatch', heroes: [], items: [], success: true } },
    },
  };
}

test('projects mechanics through their allowlist and summarizes them in the inventory', () => {
  const model = normalizeEvidence({ ...fullMatchFixture(), mechanics: mechanicsInput() });
  model.mechanics.selectedHero.lore = 'leak-token';
  model.mechanics.items[0].rawRecord = { token: 'leak-token' };

  const artifact = projectArtifact(model);
  const markdown = renderEvidenceMarkdown(artifact);

  assert.equal(artifact.mechanics.status, 'ready');
  assert.equal(artifact.mechanics.source, 'valve_datafeed');
  assert.deepEqual(artifact.mechanics.selectedHero.abilities[0].values, [{ label: 'Damage', value: '100 / 150' }]);
  assert.equal(artifact.mechanics.selectedHero.abilities[0].description, 'Deals 100 / 150 damage.');
  assert.equal(artifact.mechanics.items[0].description, 'Active: Force. Pushes a unit.');
  assert.equal(artifact.dataQuality.capabilities.currentMechanics, true);
  assert.doesNotMatch(JSON.stringify(artifact), /leak-token|lore_loc|special_values/);
  assert.match(markdown, /## Current-patch mechanics/);
  assert.match(markdown, /\| selected hero \| Keeper of the Light \(intelligence, ranged\) \|/);
  assert.match(markdown, /\| abilities \| Illuminate \(cooldown 10; mana 150\) \|/);
  assert.match(markdown, /\| items \| Force Staff \(cost 2200\) \|/);
});

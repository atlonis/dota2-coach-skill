import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { normalizeEvidence } from '../../dota2-match-coach/scripts/lib/normalize.mjs';
import { projectArtifact, renderEvidenceMarkdown, writeArtifacts } from '../../dota2-match-coach/scripts/lib/report.mjs';
import { runAnalysis } from '../../dota2-match-coach/scripts/analyze-match.mjs';

// Real OpenDota /matches responses for 7.41f matches, fetched on 2026-10-19.
// Chat, cosmetics and other fields no runtime path reads were dropped, and every
// account ID except the README example account was replaced by 900000 + slot.
const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/opendota');
const load = (name) => JSON.parse(gunzipSync(readFileSync(path.join(fixtures, name))).toString('utf8'));
const constants = load('constants-heroes-items.json.gz');
const README_ACCOUNT = 56386500;

function entityConstants() {
  return { status: 'ready', missing: [], heroes: constants.heroes, items: constants.items, abilityIds: {}, abilities: {} };
}

function normalizeMatch(name, selector, { mutate } = {}) {
  const match = load(name);
  if (mutate) mutate(match);
  return normalizeEvidence({
    matchId: match.match_id,
    ...selector,
    openDota: { status: 'ready', match, parse: { requested: false, state: 'not_requested' } },
    stratz: { status: 'unavailable', reason: 'missing_token' },
    valve: { status: 'ready', matchPatch: '7.41f', currentPatch: '7.41f', isCurrentExactPatch: true },
    entityConstants: entityConstants(),
    generatedAt: '2026-10-19T00:00:00.000Z',
  });
}

const PARSED = 'match-9048031561-parsed.json.gz';

test('rebuilds every death of a parsed match without STRATZ, from deaths_log', () => {
  const raw = load(PARSED);
  for (const player of raw.players) {
    const slot = player.player_slot < 128 ? player.player_slot : player.player_slot - 123;
    const model = normalizeMatch(PARSED, { slot });
    const analysis = model.deathAnalysis;
    assert.equal(analysis.timelineSource, 'opendota_deaths_log', `slot ${slot}`);
    assert.equal(analysis.contexts.length, player.deaths, `slot ${slot}`);
    assert.equal(analysis.unresolvedCount, 0, `slot ${slot}`);
    assert.deepEqual(analysis.contexts.map((context) => context.time), player.deaths_log.map((entry) => entry.time).sort((a, b) => a - b));
    for (const context of analysis.contexts) {
      const entry = player.deaths_log.find((row) => row.time === context.time);
      assert.ok(context.killerHero.name || context.killerUnit?.kind === 'non_hero', `slot ${slot} death ${context.time} has a killer`);
      // A death the player never respawned from before the end has no time_dead.
      assert.equal(context.timeDead, typeof entry.time_dead === 'number' ? entry.time_dead : null);
      assert.equal(context.goldLost, entry.gold_lost);
      assert.equal(context.contextReady, false);
      assert.equal(context.proximityComplete, false);
      assert.deepEqual(context.nearbyAllies, []);
    }
    assert.equal(model.dataQuality.capabilities.deathTimeline, true);
    assert.equal(model.dataQuality.capabilities.deathContext, false);
  }
});

test('keeps a death before the horn, such as a pre-game first blood', () => {
  const model = normalizeMatch(PARSED, { slot: 0 });
  const first = model.deathAnalysis.contexts[0];
  assert.equal(first.time, -4);
  assert.equal(first.killerHero.name, 'Pudge');
  assert.equal(model.phases[0].metrics.deaths >= 1, true);
});

test('places a recorded teamfight death and names who was involved on each side', () => {
  const model = normalizeMatch(PARSED, { slot: 3 });
  const inFight = model.deathAnalysis.contexts.find((context) => context.time === 4);
  assert.equal(inFight.teamfight.inFight, true);
  assert.deepEqual([inFight.teamfight.start, inFight.teamfight.end], [-31, 19]);
  assert.equal(inFight.teamfight.involvement.allies.length, 4);
  assert.equal(inFight.teamfight.involvement.enemies.length, 5);
  assert.deepEqual([inFight.position.x, inFight.position.y, inFight.position.source], [139, 113, 'opendota_teamfight']);
  // Four Radiant players died before this one inside the same fight.
  assert.equal(inFight.observations.firstAlliedDeathInFight, false);
});

test('marks the fight status unknown for a death near the end that no recorded fight covers', () => {
  const raw = load(PARSED);
  const lastFightEnd = Math.max(...raw.teamfights.map((fight) => fight.end));
  for (let slot = 0; slot < 10; slot += 1) {
    const model = normalizeMatch(PARSED, { slot });
    for (const context of model.deathAnalysis.contexts) {
      if (context.time > lastFightEnd && context.time >= raw.duration - 30) assert.equal(context.teamfight.inFight, null);
      if (context.teamfight.inFight === false) assert.ok(context.time < raw.duration - 30);
    }
  }
});

test('selects the README account on Dire and reads its lane, lane opponents and 10:00 numbers from OpenDota', () => {
  const raw = load(PARSED);
  const model = normalizeMatch(PARSED, { accountId: README_ACCOUNT });
  const own = raw.players.find((player) => player.account_id === README_ACCOUNT);
  assert.equal(model.request.slot, 8);
  assert.equal(model.player.side.value, 'dire');
  assert.equal(model.player.heroName.value, 'Skywrath Mage');
  assert.deepEqual(model.player.lane, { value: 'bottom', source: 'opendota' });
  assert.equal(model.lane.status, 'ready');
  assert.deepEqual(model.lane.opponents.map((row) => row.hero.name).sort(), ['Medusa', 'Ogre Magi']);
  assert.deepEqual(model.lane.allies.map((row) => row.hero.name), ['Pudge']);
  const row = model.players.find((player) => player.slot === 8);
  assert.equal(row.minute10.lastHits, own.lh_t[10]);
  assert.equal(row.minute10.netWorth, own.networth_t[10]);
  assert.equal(row.minute10.laneEfficiencyPct, own.lane_efficiency_pct);
  assert.equal(model.dataQuality.capabilities.laneNumbers, true);
});

test('publishes all ten players with their scoreboard, items and major item timings', () => {
  const raw = load(PARSED);
  const model = normalizeMatch(PARSED, { accountId: README_ACCOUNT });
  assert.equal(model.players.length, 10);
  for (const player of raw.players) {
    const slot = player.player_slot < 128 ? player.player_slot : player.player_slot - 123;
    const row = model.players[slot];
    assert.deepEqual([row.kills, row.deaths, row.assists, row.lastHits, row.netWorth], [player.kills, player.deaths, player.assists, player.last_hits, player.net_worth]);
    assert.equal(row.finalItems.length, [0, 1, 2, 3, 4, 5].filter((index) => player[`item_${index}`] > 0).length);
    for (const item of row.majorItems) assert.ok(constants.items[Object.keys(constants.items).find((key) => constants.items[key].id === item.item.id)].cost >= 1400);
  }
  assert.equal(model.dataQuality.capabilities.allPlayersSummary, true);
  // No item appears twice in one player's major timings.
  for (const row of model.players) assert.equal(new Set(row.majorItems.map((item) => item.item.id)).size, row.majorItems.length);
});

test('reads OpenDota percentiles with their population and the inverted deaths scale', () => {
  const model = normalizeMatch(PARSED, { accountId: README_ACCOUNT });
  assert.equal(model.percentiles.status, 'ready');
  assert.equal(model.percentiles.population, 'same_hero_recent_public_matches');
  const gpm = model.percentiles.metrics.find((row) => row.metric === 'gpm');
  assert.ok(gpm.percentile >= 0 && gpm.percentile <= 100);
  assert.ok(model.percentiles.metrics.some((row) => row.metric === 'deathsPerMin'));
});

test('counts phase kills and deaths from OpenDota logs and closes the final interval at the match end', () => {
  const raw = load(PARSED);
  const own = raw.players.find((player) => player.account_id === README_ACCOUNT);
  const model = normalizeMatch(PARSED, { accountId: README_ACCOUNT });
  const total = (metric) => model.phases.reduce((sum, phase) => sum + (phase.metrics[metric] ?? 0), 0);
  assert.equal(total('deaths'), own.deaths);
  assert.equal(total('kills'), own.kills_log.length);
  const closing = model.phases.at(-1);
  assert.equal(closing.end, raw.duration);
  assert.equal(closing.metrics.lh, own.last_hits - own.lh_t[25]);
});

test('keeps the Ancient destroyed a second after the recorded duration', () => {
  const model = normalizeMatch('match-9031156251-turbo.json.gz', { accountId: README_ACCOUNT });
  assert.ok(model.objectives.events.some((event) => event.type === 'building_destroyed' && event.building.kind === 'ancient'));
});

test('treats Turbo as its own class: clock intervals, Turbo percentiles and no normal-game peer baseline', () => {
  const match = load('match-9031156251-turbo.json.gz');
  const model = normalizeEvidence({
    matchId: match.match_id,
    accountId: README_ACCOUNT,
    openDota: { status: 'ready', match },
    stratz: { status: 'unavailable', reason: 'missing_token' },
    valve: { status: 'ready', matchPatch: '7.41f', currentPatch: '7.41f', isCurrentExactPatch: true },
    entityConstants: entityConstants(),
    baseline: { status: 'ready', heroId: 78, position: 'POSITION_1', bracket: 'LEGEND_ANCIENT', weeks: [1], points: [{ minute: 10, matchCount: 5000, cs: 50 }] },
  });
  assert.equal(model.match.modeClass, 'turbo');
  assert.deepEqual(model.phases.map((phase) => phase.id), ['minutes_0_10', 'minutes_10_15', 'minutes_15_25', 'minutes_25_end']);
  assert.equal(model.percentiles.population, 'same_hero_recent_turbo_matches');
  assert.equal(model.baseline.status, 'unavailable');
  assert.equal(model.baseline.reason, 'non_standard_mode');
  assert.match(model.warnings.join(' '), /Turbo/);
});

test('reviews an unparsed match from the scoreboard: deaths unresolved, percentiles still ready', () => {
  const raw = load('match-9047976816-unparsed.json.gz');
  const own = raw.players.find((player) => player.account_id === README_ACCOUNT);
  const model = normalizeMatch('match-9047976816-unparsed.json.gz', { accountId: README_ACCOUNT });
  assert.deepEqual(model.deathAnalysis.contexts, []);
  assert.equal(model.deathAnalysis.timelineSource, null);
  assert.equal(model.deathAnalysis.unresolvedCount, own.deaths);
  assert.equal(model.percentiles.status, 'ready');
  assert.equal(model.players.length, 10);
  assert.equal(model.dataQuality.capabilities.laneNumbers, false);
});

test('warns about an abandon and lists who left', () => {
  const model = normalizeMatch('match-9052083664-abandon.json.gz', { slot: 0 });
  assert.deepEqual(model.match.abandons.map((row) => [row.slot, row.leaverStatus]), [[4, 2]]);
  assert.match(model.warnings.join(' '), /abandoned the match/);
});

test('selects a player whose account ID OpenDota hides, by hero or by slot', () => {
  const hide = (match) => { delete match.players.find((player) => player.account_id === README_ACCOUNT).account_id; };
  const byHero = normalizeMatch(PARSED, { heroId: 101 }, { mutate: hide });
  const bySlot = normalizeMatch(PARSED, { slot: 8 }, { mutate: hide });
  for (const model of [byHero, bySlot]) {
    assert.equal(model.request.accountId, null);
    assert.equal(model.player.heroName.value, 'Skywrath Mage');
    assert.equal(model.deathAnalysis.contexts.length, 5);
    assert.equal(model.dataQuality.capabilities.scoreboard, true);
  }
});

test('falls back to the other players kills_log when deaths_log is missing, leaving non-hero deaths unresolved', () => {
  const raw = load(PARSED);
  const own = raw.players.find((player) => player.account_id === README_ACCOUNT);
  const heroDeaths = own.deaths_log.filter((entry) => entry.key.startsWith('npc_dota_hero_'));
  const model = normalizeMatch(PARSED, { accountId: README_ACCOUNT }, {
    mutate: (match) => { for (const player of match.players) delete player.deaths_log; },
  });
  assert.equal(model.deathAnalysis.timelineSource, 'opendota_kills_log');
  assert.equal(model.deathAnalysis.contexts.length, heroDeaths.length);
  assert.equal(model.deathAnalysis.unresolvedCount, own.deaths - heroDeaths.length);
  assert.deepEqual(model.deathAnalysis.contexts.map((context) => context.time), heroDeaths.map((entry) => entry.time));
});

test('runs the whole pipeline on a real response and writes an evidence inventory with the new sections', async () => {
  const match = load(PARSED);
  const directory = await mkdtemp(path.join(tmpdir(), 'dota2-coach-real-'));
  try {
    const { artifacts } = await runAnalysis({ matchId: match.match_id, accountId: README_ACCOUNT, outputDir: directory }, {
      openDotaClient: {
        loadMatch: async () => ({ status: 'ready', match, parse: { requested: false, state: 'not_requested' } }),
        loadEntityConstants: async () => entityConstants(),
      },
      valveClient: { resolvePatch: async () => ({ status: 'ready', matchPatch: '7.41f', currentPatch: '7.41f', isCurrentExactPatch: true }) },
      stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
      normalize: normalizeEvidence,
      write: writeArtifacts,
    });
    const json = JSON.parse(await readFile(artifacts.jsonPath, 'utf8'));
    const markdown = await readFile(artifacts.markdownPath, 'utf8');
    assert.equal(json.schemaVersion, '2.4.0');
    assert.equal(json.players.length, 10);
    assert.equal(json.deathAnalysis.contexts.length, 5);
    assert.equal(json.deathAnalysis.contexts[0].goldLost != null, true);
    assert.match(markdown, /## All players/);
    assert.match(markdown, /LH at 10:00/);
    assert.match(markdown, /## Percentiles \(OpenDota\)/);
    assert.match(markdown, /Deaths by killer: /);
    assert.match(markdown, /unavailable without STRATZ playback/);
    assert.doesNotMatch(markdown, /nearby allies: none|own items: none/);
    assert.match(markdown, /gold and XP end at 26:00/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('projects and renders every real fixture without throwing', () => {
  for (const name of [PARSED, 'match-9031156251-turbo.json.gz', 'match-9047976816-unparsed.json.gz', 'match-9052083664-abandon.json.gz']) {
    for (let slot = 0; slot < 10; slot += 1) {
      const artifact = projectArtifact(normalizeMatch(name, { slot }));
      assert.equal(artifact.request.slot, slot);
      assert.equal(typeof renderEvidenceMarkdown(artifact), 'string');
    }
  }
});

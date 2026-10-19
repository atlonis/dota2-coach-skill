import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { normalizeEvidence } from '../../dota2-match-coach/scripts/lib/normalize.mjs';
import { projectArtifact, renderEvidenceMarkdown } from '../../dota2-match-coach/scripts/lib/report.mjs';
import { computeCapabilities } from '../../dota2-match-coach/scripts/lib/capabilities.mjs';
import { buildDeathContexts } from '../../dota2-match-coach/scripts/lib/deaths.mjs';

// Regressions for the independent audit of revision 8851719: each test pins a
// defect it found, or a mutation its test run showed the suite did not catch.

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/opendota');
const load = (name) => JSON.parse(gunzipSync(readFileSync(path.join(fixtures, name))).toString('utf8'));
const constants = load('constants-heroes-items.json.gz');
const VALVE = { status: 'ready', matchPatch: '7.41f', currentPatch: '7.41f', isCurrentExactPatch: true };
const ENTITY_CONSTANTS = { status: 'ready', missing: [], heroes: constants.heroes, items: constants.items, abilityIds: {}, abilities: {} };

function realModel(selector, { stratz = { status: 'unavailable', reason: 'missing_token' }, mutate } = {}) {
  const match = load('match-9048031561-parsed.json.gz');
  if (mutate) mutate(match);
  return {
    match,
    model: normalizeEvidence({
      matchId: match.match_id, ...selector, openDota: { status: 'ready', match }, stratz, valve: VALVE, entityConstants: ENTITY_CONSTANTS,
    }),
  };
}

function tables(markdown) {
  const blocks = [];
  let current = null;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('|')) {
      current ??= [];
      current.push(line);
    } else if (current) {
      blocks.push(current);
      current = null;
    }
  }
  return blocks;
}

const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());

test('every evidence Markdown row has as many cells as its header, for both sides', () => {
  for (const slot of [0, 8]) {
    const markdown = renderEvidenceMarkdown(projectArtifact(realModel({ slot }).model));
    for (const block of tables(markdown)) {
      const width = cells(block[0]).length;
      for (const row of block) assert.equal(cells(row).length, width, `${block[0]} :: ${row}`);
    }
  }
});

test('death rows keep facts, observations and unavailable inputs in their own columns', () => {
  const markdown = renderEvidenceMarkdown(projectArtifact(realModel({ slot: 8 }).model));
  const block = tables(markdown).find((rows) => rows[0] === '| Time | Facts | Observations | Unavailable |');
  for (const row of block.slice(2)) {
    const [time, facts, observations, unavailable] = cells(row);
    assert.match(time, /^\d+:\d{2}$/);
    assert.match(facts, /killer: /);
    assert.match(observations, /contextIncomplete: /);
    assert.match(unavailable, /stratz_playback_unavailable/);
  }
});

test('the match-wide death context stays closed while any scoreboard death is unresolved', () => {
  const complete = { observations: { contextIncomplete: false }, contextReady: true, unavailable: [] };
  const base = { player: { accountId: { value: 1 } }, match: { durationSeconds: { value: 1 } } };
  assert.equal(computeCapabilities({ ...base, deathAnalysis: { contexts: [complete], unresolvedCount: 0 } }).deathContext, true);
  assert.equal(computeCapabilities({ ...base, deathAnalysis: { contexts: [complete], unresolvedCount: 1 } }).deathContext, false);
});

test('a Dire player sees the team economy from the Dire side and Dire buildings as their own', () => {
  const { match, model } = realModel({ slot: 8 });
  assert.equal(model.player.side.value, 'dire');
  assert.equal(model.teamEconomy.perspective, 'dire');
  assert.equal(model.teamEconomy.measures.earnedGold.values[10], -match.radiant_gold_adv[10]);
  const direTower = model.objectives.events.find((event) => event.type === 'building_destroyed' && event.building.side === 'dire');
  assert.equal(direTower.ownBuilding, true);
  const radiantTower = model.objectives.events.find((event) => event.type === 'building_destroyed' && event.building.side === 'radiant');
  assert.equal(radiantTower.ownBuilding, false);
});

test('a STRATZ lane outcome is restated from the Dire side', () => {
  const stratz = { status: 'ready', match: { bottomLaneOutcome: 'RADIANT_VICTORY', players: [] } };
  const { model } = realModel({ slot: 8 }, { stratz });
  assert.equal(model.lane.selectedLane, 'bottom');
  assert.equal(model.lane.outcome.value, 'RADIANT_VICTORY');
  assert.equal(model.lane.selectedSideOutcome, 'lost');
});

test('lists purchases once when both sources logged them', () => {
  const { match } = realModel({ slot: 8 });
  const own = match.players.find((player) => player.player_slot === 131);
  const stratz = { status: 'ready', match: { players: [{
    steamAccountId: own.account_id, heroId: own.hero_id, isRadiant: false,
    playbackData: { purchaseEvents: own.purchase_log.map((entry) => ({ time: entry.time, itemId: constants.items[entry.key]?.id ?? 1 })) },
  }] } };
  const { model } = realModel({ slot: 8 }, { stratz });
  assert.equal(model.items.purchases.length, own.purchase_log.length);
  assert.ok(model.items.purchases.every((purchase) => purchase.source === 'opendota'));
});

test('a STRATZ death with stale positions reports unknown proximity, never "nobody nearby"', () => {
  const participants = [
    { slot: 0, accountId: 10, hero: { id: 1, name: 'A' }, side: 'radiant' },
    { slot: 5, accountId: 20, hero: { id: 2, name: 'B' }, side: 'dire' },
  ];
  const result = buildDeathContexts({
    selectedSlot: 0,
    participants,
    stratzPlayers: [
      { steamAccountId: 10, heroId: 1, isRadiant: true, playbackData: { deathEvents: [{ time: 100, timeDead: 10 }], playerUpdatePositionEvents: [{ time: 99, x: 100, y: 100 }], abilityUsedEvents: [], itemUsedEvents: [], killEvents: [] } },
      { steamAccountId: 20, heroId: 2, isRadiant: false, playbackData: { deathEvents: [], playerUpdatePositionEvents: [{ time: 50, x: 100, y: 100 }] } },
    ],
    teamfights: [],
    selectedRepositions: [],
    durationSeconds: 1000,
    catalog: { hero: {}, item: {}, ability: {} },
  });
  const [context] = result.contexts;
  assert.equal(context.proximityComplete, false);
  assert.equal(context.observations.isolated, null);
  const markdown = renderEvidenceMarkdown(projectArtifact({ request: { matchId: 1 }, deathAnalysis: result }));
  assert.match(markdown, /nearby allies: unavailable; nearby enemies: unavailable/);
});

test('a pre-horn STRATZ death is kept and does not leave a scoreboard death unresolved', () => {
  const result = buildDeathContexts({
    selectedSlot: 0,
    participants: [{ slot: 0, accountId: 10, hero: { id: 1, name: 'A' }, side: 'radiant' }],
    stratzPlayers: [{ steamAccountId: 10, heroId: 1, isRadiant: true, playbackData: { deathEvents: [{ time: -12, timeDead: 8 }, { time: 300, timeDead: 20 }] } }],
    teamfights: [],
    selectedRepositions: [],
    durationSeconds: 1800,
    catalog: { hero: {}, item: {}, ability: {} },
    scoreboardDeaths: 2,
  });
  assert.deepEqual(result.contexts.map((context) => context.time), [-12, 300]);
  assert.equal(result.unresolvedCount, 0);
});

test('a death known only from OpenDota is matched to its STRATZ twin instead of being counted twice', () => {
  const { match, model: openOnly } = realModel({ slot: 8 });
  const own = match.players.find((player) => player.player_slot === 131);
  const stratz = { status: 'ready', match: { players: [{
    steamAccountId: own.account_id, heroId: own.hero_id, isRadiant: false,
    // STRATZ logs every death but the first one, one second later than OpenDota.
    playbackData: { deathEvents: own.deaths_log.slice(1).map((entry) => ({ time: entry.time + 1, timeDead: entry.time_dead })) },
  }] } };
  const { model } = realModel({ slot: 8 }, { stratz });
  assert.equal(model.deathAnalysis.contexts.length, own.deaths);
  assert.equal(model.deathAnalysis.unresolvedCount, 0);
  assert.equal(model.deathAnalysis.contexts[0].source, 'opendota_deaths_log');
  assert.ok(model.deathAnalysis.contexts.slice(1).every((context) => context.source === 'stratz' && context.goldLost != null));
  assert.equal(openOnly.deathAnalysis.contexts.length, own.deaths);
});

test('an unparsed OpenDota match carries a warning instead of an empty list', () => {
  const match = load('match-9047976816-unparsed.json.gz');
  const model = normalizeEvidence({
    matchId: match.match_id, slot: 2, openDota: { status: 'ready', match, parse: { requested: true, state: 'timeout' } },
    stratz: { status: 'unavailable', reason: 'missing_token' }, valve: VALVE, entityConstants: ENTITY_CONSTANTS,
  });
  assert.match(model.warnings.join(' '), /has not parsed the replay yet.*Rerun in 5-10 minutes/);
});

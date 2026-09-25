import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';
import { mergeWeeklyCurves } from '../lib/baseline.mjs';

test('normalizes a full match into schema v2', () => {
  const model = normalizeEvidence(fullMatchFixture());
  assert.equal(model.schemaVersion, '2.2.0');
  assert.equal(model.participants.length, 10);
  assert.equal(model.player.heroName.value, 'Keeper of the Light');
  assert.equal(model.lane.status, 'ready');
  assert.equal(model.lane.opponents.length, 2);
  assert.ok(model.lane.opponents.every((row) => row.lane === model.lane.selectedLane));
  assert.equal(model.deathAnalysis.contexts.length, 3);
  assert.equal(model.deathAnalysis.unresolvedCount, 0);
  assert.equal(model.deathAnalysis.patterns.length, 1);
  assert.equal(model.dataQuality.capabilities.currentPatch, true);
  assert.equal(Object.hasOwn(model.dataQuality, 'gates'), false);
});

test('does not invent lane or tactical death context without STRATZ', () => {
  const input = fullMatchFixture();
  input.stratz = { status: 'unavailable', reason: 'missing_token' };
  const model = normalizeEvidence(input);
  assert.equal(model.lane.status, 'unknown');
  assert.deepEqual(model.lane.opponents, []);
  assert.equal(model.dataQuality.capabilities.allPlayerPositions, false);
  assert.equal(model.dataQuality.capabilities.deathContext, false);
});

test('does not compare partial death playback against a complete peer mean', () => {
  const input = fullMatchFixture();
  input.stratz.match.players[0].playbackData.deathEvents.splice(1);

  const model = normalizeEvidence(input);

  assert.equal(model.deathAnalysis.unresolvedCount, 2);
  assert.equal(model.baseline.status, 'ready');
  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'deaths'), false);
  assert.ok(model.baseline.comparisons.some((row) => row.metric === 'lastHits'));
});

test('compares confirmed zero deaths when both scoreboards agree and playback is explicitly empty', () => {
  const input = fullMatchFixture();
  input.openDota.match.players[0].deaths = 0;
  input.stratz.match.players[0].deaths = 0;
  input.stratz.match.players[0].playbackData.deathEvents = [];

  const model = normalizeEvidence(input);

  assert.deepEqual(model.baseline.comparisons.filter((row) => row.metric === 'deaths').map((row) => row.player), [0, 0, 0, 0]);
});

for (const [name, change] of [
  ['scoreboard conflict', (input) => { input.openDota.match.players[0].deaths = 4; }],
  ['invalid timestamp', (input) => { input.stratz.match.players[0].playbackData.deathEvents[2].time = '1200'; }],
  ['out-of-match death', (input) => { input.stratz.match.players[0].playbackData.deathEvents[2].time = 1801; }],
  ['duplicate death timestamp', (input) => { input.stratz.match.players[0].playbackData.deathEvents[2].time = 900; }],
  ['duration conflict', (input) => { input.stratz.match.durationSeconds = 1799; }],
  ['hero conflict', (input) => { input.stratz.match.players[0].heroId = 2; }],
]) {
  test(`withholds death comparisons for ${name}`, () => {
    const input = fullMatchFixture();
    change(input);
    const model = normalizeEvidence(input);
    assert.equal(model.baseline.comparisons.some((row) => row.metric === 'deaths'), false);
  });
}

test('does not infer zero deaths from missing playback even when both scoreboards say zero', () => {
  const input = fullMatchFixture();
  input.openDota.match.players[0].deaths = 0;
  input.stratz.match.players[0].deaths = 0;
  delete input.stratz.match.players[0].playbackData.deathEvents;
  const model = normalizeEvidence(input);
  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'deaths'), false);
});

test('keeps complete nonzero death comparisons', () => {
  const model = normalizeEvidence(fullMatchFixture());
  assert.deepEqual(model.baseline.comparisons.filter((row) => row.metric === 'deaths').map((row) => row.player), [1, 2, 3, 3]);
});

test('applies the sample floor to each metric after merging partially populated weeks', () => {
  const input = fullMatchFixture();
  input.baseline.points = mergeWeeklyCurves([
    [{ time: 10, matchCount: 1, cs: 20, xp: 3000 }],
    [{ time: 10, matchCount: 10_000, cs: null, xp: 4000 }],
  ]);
  const model = normalizeEvidence(input);

  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'lastHits'), false);
  assert.deepEqual(model.baseline.comparisons.map((row) => [row.metric, row.matchCount]), [['xp', 10_001]]);
});

test('reports the actual metric sample size on each comparison', () => {
  const input = fullMatchFixture();
  input.baseline.points = mergeWeeklyCurves([
    [{ time: 10, matchCount: 200, cs: 20, deaths: 1, xp: 3000 }],
    [{ time: 10, matchCount: 10_000, cs: null, deaths: null, xp: 4000 }],
  ]);
  const model = normalizeEvidence(input);

  assert.deepEqual(model.baseline.comparisons.map((row) => [row.metric, row.matchCount]), [
    ['lastHits', 200], ['xp', 10_200], ['deaths', 200],
  ]);
});

test('does not fall back to the whole sample when a metric sample map omits that metric', () => {
  const input = fullMatchFixture();
  input.baseline.points = [{ minute: 10, matchCount: 10_000, cs: 20, xp: 4000, metricSampleSizes: { xp: 10_000 } }];
  const model = normalizeEvidence(input);
  assert.deepEqual(model.baseline.comparisons.map((row) => row.metric), ['xp']);
});

function shiftTicks(player, firstSecond) {
  const times = [];
  for (let second = firstSecond; second <= 1800; second += 60) times.push(second);
  const at = (factor) => times.map((second) => (second / 60) * factor);
  return { ...player, times, gold_t: at(300), xp_t: at(400), lh_t: at(5), dn_t: at(0.25), hero_damage_t: at(200) };
}

test('keys stage and peer markers by recorded minute when replay ticks start at 2:00', () => {
  const input = fullMatchFixture();
  input.openDota.match.players[0] = shiftTicks(input.openDota.match.players[0], 120);

  const model = normalizeEvidence(input);

  assert.deepEqual(model.series.lh.values.slice(0, 3), [null, null, 10]);
  assert.equal(model.series.lh.values[10], 50);
  assert.equal(model.series.lh.minuteBasis, 'recorded_times');
  assert.deepEqual(model.baseline.comparisons.find((row) => row.metric === 'lastHits' && row.minute === 10).player, 50);
  assert.equal(model.phases.find((phase) => phase.id === 'lane').metrics.lh, null);
  assert.equal(model.phases.find((phase) => phase.id === 'transition').metrics.lh, 25);
});

test('drops a per-minute series whose recorded times disagree with its length', () => {
  const input = fullMatchFixture();
  const player = shiftTicks(input.openDota.match.players[0], 0);
  player.lh_t = player.lh_t.slice(1);
  input.openDota.match.players[0] = player;

  const model = normalizeEvidence(input);

  assert.deepEqual(model.series.lh.values, []);
  assert.equal(model.series.lh.source, null);
  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'lastHits'), false);
  assert.ok(model.warnings.some((warning) => warning.includes('last hits')));
  assert.equal(model.series.gold.values[10], 3000);
});

test('compares net worth only through the replay net worth series', () => {
  const input = fullMatchFixture();
  input.baseline.points = input.baseline.points.map((point) => ({ ...point, networth: point.minute * 350 }));
  let model = normalizeEvidence(input);
  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'netWorth'), false);
  assert.deepEqual(model.series.netWorth, { values: [], source: null, minuteBasis: null });

  input.openDota.match.players[0].networth_t = Array.from({ length: 31 }, (_, minute) => minute * 320);
  model = normalizeEvidence(input);
  const row = model.baseline.comparisons.find((comparison) => comparison.metric === 'netWorth' && comparison.minute === 10);
  assert.deepEqual([row.player, row.baseline, row.crossSourceProxy], [3200, 3500, false]);
  assert.equal(model.series.netWorth.values[10], 3200);
});

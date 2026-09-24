import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, symlink, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildProgress, loadProgressHistory } from '../lib/progress.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { projectArtifact } from '../lib/report.mjs';
import { fullMatchFixture } from './fixtures.mjs';

function model(matchId = 300, startTime = 3000000, multiplier = 1) {
  const fixture = fullMatchFixture();
  fixture.stratz.match.gameMode = 'ALL_PICK_RANKED';
  const evidence = normalizeEvidence(fixture);
  evidence.request.matchId = matchId;
  evidence.match.startTime.value = startTime;
  for (const row of Object.values(evidence.series)) row.values = row.values.map((value) => value * multiplier);
  return evidence;
}

function comparison(result, metric = 'lastHits', minute = 10) {
  return result.comparisons.find((row) => row.metric === metric && row.minute === minute);
}

test('compares exact-minute series from projected reports with metric-specific means and sample sizes', () => {
  const current = model();
  const first = projectArtifact(model(100, 1000000, 0.5));
  const second = projectArtifact(model(200, 2000000, 1.5));
  const third = projectArtifact(model(250, 2500000, 5));
  third.series.lh.values[10] = null;
  const result = buildProgress(current, [third, first, second]);

  assert.equal(result.status, 'ready');
  assert.equal(result.eligibleMatchCount, 3);
  assert.deepEqual(comparison(result), {
    metric: 'lastHits', minute: 10, current: 50, mean: 50, delta: 0, matchCount: 2, source: 'opendota',
  });
  assert.equal(comparison(result, 'xp').matchCount, 3);
  assert.equal(comparison(result, 'gold').metric, 'gold');
  assert.deepEqual(result.history.map((row) => row.matchId), [100, 200, 250]);
  assert.ok(result.comparisons.every((row) => [10, 15, 25].includes(row.minute)));
  assert.ok(result.limitations.includes('no_causal_inference'));
});

test('compares per-minute replay net worth when every contributing match recorded it', () => {
  const withNetWorth = (evidence, perMinute) => {
    evidence.series.netWorth = { values: Array.from({ length: 31 }, (_, minute) => minute * perMinute), source: 'opendota', minuteBasis: 'recorded_times' };
    return evidence;
  };
  const current = withNetWorth(model(), 400);
  const result = buildProgress(current, [
    projectArtifact(withNetWorth(model(100, 1000000), 300)),
    projectArtifact(withNetWorth(model(200, 2000000), 350)),
  ]);

  assert.deepEqual(comparison(result, 'netWorth'), {
    metric: 'netWorth', minute: 10, current: 4000, mean: 3250, delta: 750, matchCount: 2, source: 'opendota',
  });
  assert.equal(comparison(buildProgress(current, [model(100, 1000000), model(200, 2000000)]), 'netWorth'), undefined);
});

test('does not manufacture means from one prior match or carry earlier samples forward', () => {
  const current = model();
  const first = model(100, 1000000);
  const second = model(200, 2000000);
  second.series.lh.values[10] = null;
  const single = buildProgress(current, [first]);
  assert.equal(single.status, 'unavailable');
  assert.equal(single.reason, 'insufficient_comparable_history');
  assert.deepEqual(single.comparisons, []);
  assert.equal(comparison(buildProgress(current, [first, second])), undefined);
});

test('only compares minutes reached in every contributing match and never compares final totals', () => {
  const short = model(100, 1000000);
  short.match.durationSeconds.value = 700;
  const current = model();
  current.summary.netWorth.value = 9999999;
  const result = buildProgress(current, [short, model(200, 2000000)]);
  assert.ok(result.comparisons.length > 0);
  assert.ok(result.comparisons.every((row) => row.minute === 10));
  assert.ok(result.comparisons.every((row) => row.metric !== 'netWorth' && row.current !== 9999999));
});

for (const [label, mutate] of [
  ['patch', (m) => { m.patch.match.value = 'different-subpatch'; }],
  ['unverified patch', (m) => { m.patch.isCurrentExactPatch.value = false; }],
  ['current patch label', (m) => { m.patch.current.value = 'different-subpatch'; }],
  ['mode', (m) => { m.match.gameMode.value = 'TURBO'; }],
  ['hero', (m) => { m.player.heroId.value = 1; }],
  ['position', (m) => { m.player.position.value = 4; }],
  ['account', (m) => { m.player.accountId.value = 101; m.request.accountId = 101; }],
  ['zero account', (m) => { m.player.accountId.value = 0; m.request.accountId = 0; }],
  ['unknown account', (m) => { m.player.accountId.value = null; }],
  ['request account conflict', (m) => { m.request.accountId = 101; }],
  ['candidate conflict', (m) => { m.player.heroId.candidates = [{ value: 1, source: 'stratz' }]; }],
  ['provider patch conflict', (m) => { m.sources.valve.matchPatch = 'different-subpatch'; }],
  ['unverified provider', (m) => { m.sources.valve.status = 'unavailable'; }],
  ['missing provenance', (m) => { m.match.gameMode.source = null; }],
  ['failed identity provider', (m) => { m.sources.opendota.status = 'error'; }],
  ['future date', (m) => { m.match.startTime.value = 4000000; }],
  ['equal date', (m) => { m.match.startTime.value = 3000000; }],
  ['missing date', (m) => { m.match.startTime.value = null; }],
  ['unknown schema', (m) => { m.schemaVersion = '1.0.0'; }],
]) {
  test(`excludes a historical artifact with incompatible ${label}`, () => {
    const prior = model(100, 1000000);
    mutate(prior);
    const result = buildProgress(model(), [prior, model(200, 2000000)]);
    assert.equal(result.eligibleMatchCount, 1);
    assert.equal(result.excludedMatchCount, 1);
    assert.deepEqual(result.comparisons, []);
  });
}

test('excludes malformed, duplicate and same-match artifacts without changing chronological ordering', () => {
  const first = model(100, 1000000);
  const second = model(200, 2000000);
  const result = buildProgress(model(), [second, first, first, model(), null, {}, 'secret']);
  assert.equal(result.eligibleMatchCount, 2);
  assert.equal(result.excludedMatchCount, 5);
  assert.deepEqual(result.history, [{ matchId: 100, startTime: 1000000 }, { matchId: 200, startTime: 2000000 }]);
  assert.equal(comparison(result).matchCount, 2);
});

test('conflicting snapshots of one historical match are excluded regardless of order', () => {
  const first = model(100, 1000000);
  const conflicting = projectArtifact(model(100, 1000000, 2));
  const second = model(200, 2000000);
  const forward = buildProgress(model(), [first, conflicting, second]);
  const reversed = buildProgress(model(), [second, conflicting, first]);
  assert.equal(forward.eligibleMatchCount, 1);
  assert.equal(forward.excludedMatchCount, 2);
  assert.deepEqual(forward, reversed);
});

test('raw and projected identical snapshots deduplicate without losing their match', () => {
  const first = model(100, 1000000);
  const result = buildProgress(model(), [first, projectArtifact(first), model(200, 2000000)]);
  assert.equal(result.eligibleMatchCount, 2);
  assert.equal(result.excludedMatchCount, 1);
  assert.equal(comparison(result).matchCount, 2);
});

test('another player reviewed in the same match does not invalidate the selected player history', () => {
  const first = model(100, 1000000);
  const otherPlayer = model(100, 1000000, 2);
  otherPlayer.request.accountId = 101;
  otherPlayer.player.accountId.value = 101;
  otherPlayer.player.heroId.value = 2;
  const result = buildProgress(model(), [first, otherPlayer, model(200, 2000000)]);
  assert.equal(result.eligibleMatchCount, 2);
  assert.equal(result.excludedMatchCount, 1);
  assert.equal(comparison(result).mean, 50);
});

test('a current match without verified exact patch or identity cannot establish a comparison', () => {
  const current = model();
  current.patch.isCurrentExactPatch.value = null;
  assert.equal(buildProgress(current, [model(100, 1000000), model(200, 2000000)]).reason, 'current_match_ineligible');
  current.patch.isCurrentExactPatch.value = true;
  current.player.accountId.value = 0;
  assert.equal(buildProgress(current, []).reason, 'current_match_ineligible');
});

test('unknown, conflicting or unavailable series provenance is not comparable', () => {
  const first = model(100, 1000000);
  first.series.lh.source = 'stratz';
  const second = model(200, 2000000);
  let result = buildProgress(model(), [first, second]);
  assert.equal(comparison(result), undefined);
  assert.ok(comparison(result, 'xp'));
  first.series.lh.source = 'opendota';
  first.sources.opendota.status = 'unavailable';
  result = buildProgress(model(), [first, second]);
  assert.deepEqual(result.comparisons, []);
});

test('repeated death observations expose complete per-observation coverage and shares', () => {
  const result = buildProgress(model(), [model(100, 1000000), model(200, 2000000)]);
  const observation = result.deathObservations.find((row) => row.observation === 'isolated');
  assert.ok(observation);
  assert.equal(observation.currentCount, 2);
  assert.equal(observation.currentDeaths, 3);
  assert.equal(observation.priorCount, 4);
  assert.equal(observation.priorDeaths, 6);
  assert.equal(observation.priorMatchCount, 2);
  assert.equal(observation.priorMatchesWithObservation, 2);
  assert.equal(observation.currentShare, 2 / 3);
  assert.equal(observation.priorMeanShare, 2 / 3);
});

test('partial or duplicated death events cannot imply a lower observation frequency', () => {
  const current = model();
  current.deathAnalysis.contexts = current.deathAnalysis.contexts.slice(0, 1);
  current.deathAnalysis.unresolvedCount = 0;
  assert.deepEqual(buildProgress(current, [model(100, 1000000), model(200, 2000000)]).deathObservations, []);
  const prior = model(100, 1000000);
  prior.deathAnalysis.contexts[1] = structuredClone(prior.deathAnalysis.contexts[0]);
  assert.deepEqual(buildProgress(model(), [prior, model(200, 2000000)]).deathObservations, []);
});

test('conflicting player death counts cannot pass as missing corroboration', () => {
  const current = model();
  current.player.deaths = { value: null, source: null, candidates: [{ value: 3, source: 'opendota' }, { value: 4, source: 'stratz' }] };
  assert.deepEqual(buildProgress(current, [model(100, 1000000), model(200, 2000000)]).deathObservations, []);
});

test('a previously repeated observation can be absent among the current deaths', () => {
  const current = model();
  for (const context of current.deathAnalysis.contexts) context.observations.isolated = false;
  const result = buildProgress(current, [model(100, 1000000), model(200, 2000000)]);
  const observation = result.deathObservations.find((row) => row.observation === 'isolated');
  assert.equal(observation.currentCount, 0);
  assert.equal(observation.currentShare, 0);
  assert.equal(observation.priorMeanShare, 2 / 3);
});

test('an unavailable scoreboard provider cannot establish a death denominator', () => {
  const current = model();
  for (const field of [current.player.accountId, current.player.heroId, current.player.position, current.match.gameMode, current.match.startTime, current.match.durationSeconds]) field.source = 'stratz';
  current.sources.opendota.status = 'unavailable';
  assert.deepEqual(buildProgress(current, [model(100, 1000000), model(200, 2000000)]).deathObservations, []);
});

test('unknown observation values are excluded individually without becoming false', () => {
  const prior = model(100, 1000000);
  prior.deathAnalysis.contexts[0].observations.isolated = null;
  const result = buildProgress(model(), [prior, model(200, 2000000)]);
  assert.equal(result.deathObservations.find((row) => row.observation === 'isolated'), undefined);
  assert.ok(result.deathObservations.find((row) => row.observation === 'afterConfirmedTeleport'));
});

test('zero deaths and one observed historical occurrence do not establish a repeated death pattern', () => {
  const zero = model(100, 1000000);
  zero.summary.deaths.value = 0;
  zero.player.deaths.value = 0;
  zero.deathAnalysis.contexts = [];
  assert.deepEqual(buildProgress(model(), [zero, model(200, 2000000)]).deathObservations, []);
});

test('does not mutate input or pass through unrecognized data to progress output', () => {
  const current = model();
  const prior = model(100, 1000000);
  current.secret = 'private-current';
  prior.apiToken = 'private-history';
  prior.series.lh.token = 'private-series';
  const before = JSON.stringify([current, prior]);
  const result = buildProgress(current, [prior, model(200, 2000000)]);
  assert.equal(JSON.stringify([current, prior]), before);
  assert.doesNotMatch(JSON.stringify(result), /private-/);
});

test('loads only bounded regular JSON artifacts and discards raw or unknown payload fields', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'coach-progress-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const artifact = projectArtifact(model(100, 1000000));
  artifact.apiToken = 'private-token';
  artifact.sources.opendota.headers = { authorization: 'private-header' };
  artifact.deathAnalysis.contexts[0].raw = { secret: 'private-death' };
  await writeFile(path.join(directory, 'good.json'), JSON.stringify(artifact));
  await writeFile(path.join(directory, 'bad.json'), '{invalid private-secret');
  await writeFile(path.join(directory, 'raw.json'), JSON.stringify({ raw: 'private-raw' }));
  await writeFile(path.join(directory, 'oversized.json'), ' '.repeat(2 * 1024 * 1024 + 1));
  await writeFile(path.join(directory, 'notes.txt'), 'private-notes');
  try {
    await symlink(path.join(directory, 'good.json'), path.join(directory, 'symlink.json'));
  } catch (error) {
    // Windows may lack the privilege to create a file symlink; all regular-file
    // filtering assertions below still run on that host.
    if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    t.diagnostic('File-symlink check unavailable on this Windows host.');
  }
  await mkdir(path.join(directory, 'nested.json'));
  const result = await loadProgressHistory(directory);
  assert.equal(result.status, 'ready');
  assert.equal(result.artifacts.length, 1);
  assert.ok(result.skippedFileCount >= 4);
  assert.equal(result.truncated, false);
  assert.doesNotMatch(JSON.stringify(result), /private-|coach-progress-|headers|apiToken/);
  const progress = buildProgress(model(), [result.artifacts[0], model(200, 2000000)]);
  assert.equal(progress.eligibleMatchCount, 2);
});

test('invalid directory diagnostics are safe and do not abort the review', async () => {
  const result = await loadProgressHistory('/missing/private-access-token/directory');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'history_directory_unavailable');
  assert.deepEqual(result.artifacts, []);
  assert.doesNotMatch(JSON.stringify(result), /private-access-token|ENOENT|\/missing/);
});

test('loader preserves provenance conflicts without passing through arbitrary candidate strings', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'coach-progress-conflict-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const artifact = projectArtifact(model(100, 1000000));
  artifact.player.heroId.candidates = [{ value: 'private candidate data with spaces', source: 'stratz' }];
  await writeFile(path.join(directory, 'conflict.json'), JSON.stringify(artifact));
  const loaded = await loadProgressHistory(directory);
  assert.doesNotMatch(JSON.stringify(loaded), /private candidate/);
  const progress = buildProgress(model(), [...loaded.artifacts, model(200, 2000000)]);
  assert.equal(progress.eligibleMatchCount, 1);
});

test('history loader truncates excessive file counts', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'coach-progress-limit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(Array.from({ length: 105 }, (_, index) => writeFile(path.join(directory, `${index}.json`), JSON.stringify(model(index + 1, index + 1)))));
  const result = await loadProgressHistory(directory);
  assert.equal(result.artifacts.length, 100);
  assert.equal(result.truncated, true);
});

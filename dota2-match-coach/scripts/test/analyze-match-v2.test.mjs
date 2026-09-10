import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AnalysisError, runAnalysis, runCli } from '../analyze-match.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';
import { projectArtifact, writeArtifacts } from '../lib/report.mjs';

function fixtureDependencies({
  input = fullMatchFixture(),
  entityConstants = input.entityConstants,
  normalize = normalizeEvidence,
  write = async () => ({ jsonPath: 'x.json', markdownPath: 'x.md' }),
  baselineClient,
} = {}) {
  return {
    openDotaClient: {
      loadMatch: async () => input.openDota,
      loadEntityConstants: async () => entityConstants,
    },
    stratzClient: { loadMatch: async () => input.stratz },
    valveClient: { resolvePatch: async () => input.valve },
    baselineClient,
    normalize,
    write,
  };
}

test('reuses one entity catalog across both normalization passes', async () => {
  const input = fullMatchFixture();
  const seen = [];
  const dependencies = fixtureDependencies({
    input,
    normalize: (value) => {
      seen.push(value.entityConstants);
      return normalizeEvidence(value);
    },
    baselineClient: { loadPeerBaseline: async () => input.baseline },
  });

  await runAnalysis({ matchId: input.matchId, accountId: input.accountId }, dependencies);

  assert.equal(seen.length, 2);
  assert.ok(seen.every((value) => value === input.entityConstants));
});

test('refuses an old patch before catalog lookup or artifact writing', async () => {
  let catalogCalls = 0;
  let writes = 0;
  const dependencies = {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 1 } }),
      loadEntityConstants: async () => { catalogCalls += 1; return { status: 'ready', heroes: {} }; },
    },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    valveClient: { resolvePatch: async () => ({ status: 'ready', isCurrentExactPatch: false }) },
    normalize: () => assert.fail('normalize must not run'),
    write: async () => { writes += 1; },
  };

  await assert.rejects(
    runAnalysis({ matchId: 1, accountId: 10 }, dependencies),
    (error) => error instanceof AnalysisError && error.code === 'unsupported_patch',
  );
  assert.equal(catalogCalls, 0);
  assert.equal(writes, 0);
});

test('uses entity constants for hero selection and keeps selector conflicts at CLI exit code 2', async () => {
  const input = fullMatchFixture();
  let catalogCalls = 0;
  const dependencies = fixtureDependencies({ input });
  dependencies.openDotaClient.loadEntityConstants = async () => {
    catalogCalls += 1;
    return input.entityConstants;
  };
  const errors = [];

  const code = await runCli([
    '--match-id', String(input.matchId),
    '--account-id', '101',
    '--hero', 'Keeper of the Light',
  ], { dependencies, stderr: (line) => errors.push(line), stdout: () => {} });

  assert.equal(code, 2);
  assert.deepEqual(errors, ['error: selector_conflict']);
  assert.equal(catalogCalls, 1);
});

test('keeps account-id analysis available with partial constants and unknown entity names', async () => {
  const input = fullMatchFixture();
  const partial = {
    status: 'partial',
    heroes: {},
    items: input.entityConstants.items,
    abilityIds: input.entityConstants.abilityIds,
    abilities: input.entityConstants.abilities,
    missing: ['heroes'],
  };
  let written;
  const dependencies = fixtureDependencies({
    input,
    entityConstants: partial,
    write: async (model) => {
      written = model;
      return { jsonPath: 'x.json', markdownPath: 'x.md' };
    },
  });

  await runAnalysis({ matchId: input.matchId, accountId: input.accountId }, dependencies);

  assert.equal(written.player.heroName.value, null);
  assert.deepEqual(written.sources.entityConstants, { status: 'partial' });
});

test('returns a degraded model without tactical death context when STRATZ is unavailable', async () => {
  const input = fullMatchFixture();
  input.stratz = { status: 'unavailable', reason: 'missing_token' };
  let written;
  const dependencies = fixtureDependencies({
    input,
    write: async (model) => {
      written = model;
      return { jsonPath: 'x.json', markdownPath: 'x.md' };
    },
  });

  await runAnalysis({ matchId: input.matchId, accountId: input.accountId }, dependencies);

  assert.equal(written.dataQuality.capabilities.deathContext, false);
  assert.equal(written.deathAnalysis.contexts.length, 0);
  assert.equal(written.sources.entityConstants.status, 'ready');
});

test('preserves unresolved deaths and unavailable observations with partial playback', async () => {
  const input = fullMatchFixture();
  const selected = input.stratz.match.players[0];
  selected.playbackData = { deathEvents: [{ time: 600 }] };
  let written;
  const dependencies = fixtureDependencies({
    input,
    write: async (model) => {
      written = model;
      return { jsonPath: 'x.json', markdownPath: 'x.md' };
    },
  });

  await runAnalysis({ matchId: input.matchId, accountId: input.accountId }, dependencies);

  assert.equal(written.deathAnalysis.unresolvedCount, 2);
  assert.ok(written.deathAnalysis.contexts[0].unavailable.includes('death_position_unavailable'));
  assert.equal(written.dataQuality.capabilities.deathContext, false);
});

test('does not write artifacts when hero selection is ambiguous', async () => {
  const input = fullMatchFixture();
  input.entityConstants.heroes[90] = { id: 90, localized_name: 'Twin Light' };
  input.entityConstants.heroes[91] = { id: 91, localized_name: 'Twin Light' };
  let writes = 0;
  const dependencies = fixtureDependencies({
    input,
    write: async () => { writes += 1; },
  });

  await assert.rejects(
    runAnalysis({ matchId: input.matchId, heroName: 'Twin Light' }, dependencies),
    (error) => error?.code === 'hero_ambiguous',
  );
  assert.equal(writes, 0);
});

test('history option compares saved prior matches and persists progress in both artifacts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dota-progress-cli-'));
  try {
    const historyDir = path.join(directory, 'history');
    await mkdir(historyDir);
    for (const [index, slope] of [3, 4].entries()) {
      const prior = fullMatchFixture();
      prior.stratz.match.gameMode = 'ALL_PICK_RANKED';
      prior.matchId -= index + 1;
      prior.openDota.match.start_time -= (index + 1) * 3600;
      prior.stratz.match.startDateTime = prior.openDota.match.start_time;
      prior.openDota.match.players[0].lh_t = Array.from({ length: 31 }, (_, minute) => minute * slope);
      await writeFile(path.join(historyDir, `${index}.json`), JSON.stringify(projectArtifact(normalizeEvidence(prior))));
    }
    const input = fullMatchFixture();
    input.stratz.match.gameMode = 'ALL_PICK_RANKED';
    const { model, artifacts } = await runAnalysis({
      matchId: input.matchId, accountId: input.accountId, historyDir, outputDir: path.join(directory, 'output'),
    }, fixtureDependencies({ input, write: writeArtifacts }));
    assert.equal(model.progress?.status, 'ready');
    const written = JSON.parse(await readFile(artifacts.jsonPath, 'utf8'));
    const row = written.progress.comparisons.find((entry) => entry.metric === 'lastHits' && entry.minute === 10);
    assert.deepEqual({ current: row.current, mean: row.mean, delta: row.delta, count: row.matchCount }, {
      current: 50, mean: 35, delta: 15, count: 2,
    });
    assert.equal(written.progress.historyLoad.status, 'ready');
    assert.match(await readFile(artifacts.markdownPath, 'utf8'), /\| lastHits \| 10:00 \| 50 \| 35 \| 15 \| 2 \|/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('unreadable requested history preserves match facts and reports safe progress unavailability', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dota-progress-missing-'));
  try {
    const input = fullMatchFixture();
    const { model } = await runAnalysis({
      matchId: input.matchId, accountId: input.accountId, historyDir: path.join(directory, 'private-missing-directory'),
    }, fixtureDependencies({ input }));
    assert.equal(model.player.deaths.value, 3);
    assert.equal(model.progress?.status, 'unavailable');
    assert.equal(model.progress.historyLoad.status, 'unavailable');
    assert.doesNotMatch(JSON.stringify(model.progress), /private-missing-directory|ENOENT|stack/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

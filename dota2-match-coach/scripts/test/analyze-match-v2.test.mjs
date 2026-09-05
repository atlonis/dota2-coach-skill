import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisError, runAnalysis, runCli } from '../analyze-match.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';

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

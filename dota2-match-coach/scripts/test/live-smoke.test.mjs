import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runAnalysis } from '../analyze-match.mjs';
import { createOpenDotaClient } from '../lib/opendota.mjs';
import { createStratzClient } from '../lib/stratz.mjs';
import { createValveClient } from '../lib/valve.mjs';
import { createBaselineClient } from '../lib/baseline.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { writeArtifacts } from '../lib/report.mjs';

const matchId = Number(process.env.DOTA2_COACH_LIVE_MATCH_ID);
const accountId = Number(process.env.DOTA2_COACH_LIVE_ACCOUNT_ID);
const suppliedHeroName = process.env.DOTA2_COACH_LIVE_HERO?.trim() || null;
const hasAccountId = Number.isSafeInteger(accountId) && accountId > 0;
const enabled = Number.isSafeInteger(matchId) && matchId > 0 && (hasAccountId || suppliedHeroName != null);

test('live current-patch match emits a valid v2 artifact', { skip: !enabled, timeout: 180_000 }, async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'dota2-coach-live-'));
  try {
    // Prefer the stable account selector: a leftover hero variable must not turn a
    // valid account-based smoke into a selector-conflict failure.
    const result = await runAnalysis({
      matchId,
      accountId: hasAccountId ? accountId : null,
      heroName: hasAccountId ? null : suppliedHeroName,
      parseTimeoutMs: 120_000,
      outputDir,
    }, {
      openDotaClient: createOpenDotaClient(),
      stratzClient: createStratzClient({ apiKey: process.env.STRATZ_API_KEY }),
      valveClient: createValveClient(),
      baselineClient: createBaselineClient({ apiKey: process.env.STRATZ_API_KEY }),
      normalize: normalizeEvidence,
      write: writeArtifacts,
    });
    const artifact = JSON.parse(await readFile(result.artifacts.jsonPath, 'utf8'));
    const contexts = artifact.deathAnalysis?.contexts;
    const unresolvedCount = artifact.deathAnalysis?.unresolvedCount;

    assert.equal(artifact.schemaVersion, '2.0.0');
    assert.equal(artifact.dataQuality?.capabilities?.currentPatch, true);
    assert.ok(Array.isArray(artifact.participants));
    assert.equal(artifact.participants.length, 10);
    assert.ok(Array.isArray(contexts));
    assert.ok(Number.isInteger(unresolvedCount));
    assert.ok(Number.isInteger(artifact.player?.deaths?.value));
    assert.equal(contexts.length + unresolvedCount, artifact.player.deaths.value);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

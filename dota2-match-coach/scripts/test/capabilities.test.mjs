import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCapabilities, qualityFromCapabilities } from '../lib/capabilities.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { projectArtifact, renderEvidenceMarkdown } from '../lib/report.mjs';
import { fullMatchFixture } from './fixtures.mjs';

test('one stale participant closes only its death context, while complete deaths remain usable', () => {
  const input = fullMatchFixture();
  input.stratz.match.players[1].playbackData.playerUpdatePositionEvents[0].time = 596;
  const model = normalizeEvidence(input);
  const artifact = projectArtifact(model);
  assert.equal(artifact.dataQuality.capabilities.deathContext, false);
  assert.equal(artifact.dataQuality.capabilities.individualDeathContext, true);
  assert.deepEqual(artifact.deathAnalysis.contexts.map((row) => row.contextReady), [false, true, true]);
  assert.equal(artifact.deathAnalysis.contexts[0].observations.isolated, null);
  assert.match(renderEvidenceMarkdown(artifact), /Complete individual contexts: 2 of 3/);
});

test('unresolved scoreboard deaths do not suppress a complete recorded context', () => {
  const input = fullMatchFixture();
  input.stratz.match.players[0].playbackData.deathEvents.pop();
  const model = normalizeEvidence(input);
  assert.equal(model.deathAnalysis.unresolvedCount, 1);
  assert.equal(model.dataQuality.capabilities.deathContext, false);
  assert.equal(model.dataQuality.capabilities.individualDeathContext, true);
});

test('one ability event does not unlock death context', () => {
  const capabilities = computeCapabilities({
    player: { accountId: { value: 10 } },
    match: { durationSeconds: { value: 1800 } },
    phases: [],
    draft: { complete: true, radiant: Array(5), dire: Array(5) },
    participants: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      playbackAvailable: slot === 0,
    })),
    events: { abilityUses: [{ time: 100 }], deaths: [{ time: 200 }] },
    deathAnalysis: { contexts: [], patterns: [], unresolvedCount: 1 },
    baseline: { comparisons: [] },
    patch: { isCurrentExactPatch: { value: true } },
  });
  assert.equal(capabilities.selectedTimeline, true);
  assert.equal(capabilities.allPlayerPositions, false);
  assert.equal(capabilities.deathContext, false);
  assert.equal(capabilities.deathPattern, false);
});

test('capabilities open independently from their own minimum data', () => {
  const capabilities = computeCapabilities({
    player: { accountId: { value: 10 } },
    match: { durationSeconds: { value: 1800 } },
    phases: [{ metrics: { gold: 1000 } }],
    draft: { complete: false, radiant: [], dire: [] },
    participants: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      playbackAvailable: true,
      positionTimelineAvailable: true,
    })),
    events: { deaths: [{ time: 200 }] },
    deathAnalysis: {
      contexts: [{ time: 200, observations: { contextIncomplete: false } }],
      patterns: [{ signature: 'isolated', count: 2 }],
      unresolvedCount: 0,
    },
    baseline: { comparisons: [{ metric: 'deaths', minute: 10 }] },
    patch: { isCurrentExactPatch: { value: true } },
  });
  assert.equal(capabilities.phaseAggregates, true);
  assert.equal(capabilities.draft, false);
  assert.equal(capabilities.peerBaseline, true);
  assert.equal(capabilities.deathContext, true);
  assert.equal(capabilities.deathPattern, true);
});

test('quality does not report an observed absence of repeated deaths as missing', () => {
  const quality = qualityFromCapabilities({
    scoreboard: true,
    phaseAggregates: true,
    draft: true,
    peerBaseline: false,
    selectedTimeline: true,
    allPlayerPositions: false,
    deathContext: true,
    deathPattern: false,
    currentPatch: true,
  });
  assert.equal(quality.mode, 'full');
  assert.deepEqual(quality.missing, ['peer baseline', 'positions for all participants']);
});

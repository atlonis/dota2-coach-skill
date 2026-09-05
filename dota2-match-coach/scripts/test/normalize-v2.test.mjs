import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';

test('normalizes a full match into schema v2', () => {
  const model = normalizeEvidence(fullMatchFixture());
  assert.equal(model.schemaVersion, '2.0.0');
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

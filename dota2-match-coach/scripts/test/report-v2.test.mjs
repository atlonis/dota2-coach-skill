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

  assert.equal(artifact.schemaVersion, '2.0.0');
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

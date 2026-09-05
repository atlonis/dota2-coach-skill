import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { projectArtifact, renderEvidenceMarkdown, writeArtifacts } from '../../dota2-match-coach/scripts/lib/report.mjs';

function evidenceModel() {
  return {
    schemaVersion: '2.0.0',
    request: { matchId: '42', accountId: 56386500 },
    generatedAt: '2026-08-25T00:00:00.000Z',
    sources: {
      opendota: { status: 'ready', parse: { requested: true, state: 'completed' } },
      stratz: { status: 'unavailable', reason: 'missing_token' },
      valve: { status: 'ready', matchPatch: '7.40', currentPatch: '7.40', isCurrentExactPatch: true },
      entityConstants: { status: 'ready' },
    },
    match: {
      result: { value: 'win', source: 'opendota' }, durationSeconds: { value: 1800, source: 'opendota' },
      startTime: { value: 1785400000, source: 'opendota' }, averageRank: { value: 60, label: 'Ancient', source: 'stratz' },
      gameMode: { value: 22, label: 'All Draft', source: 'opendota' },
      lobbyType: { value: 0, label: 'Unranked', source: 'opendota' },
    },
    player: {
      accountId: { value: 56386500, source: 'opendota' }, heroId: { value: 107, source: 'opendota' }, heroName: { value: 'Earth Spirit', source: 'opendota_constants' },
      side: { value: 'radiant', source: 'opendota' }, position: { value: 2, source: 'opendota' }, lane: { value: 'MID', source: 'stratz' }, rank: { value: 42, label: 'Archon 2', source: 'stratz' },
      kills: { value: 8, source: 'opendota' }, deaths: { value: 2, source: 'opendota' }, assists: { value: 6, source: 'opendota' }, result: { value: 'win', source: 'opendota' },
    },
    draft: { radiant: [{ value: { id: 107, name: 'Earth Spirit' }, source: 'opendota' }], dire: [{ value: { id: 1, name: 'Anti-Mage' }, source: 'opendota' }], complete: false },
    lane: { selectedLane: 'mid', opponents: [], status: 'unknown', reason: 'opponents_unknown' },
    summary: {
      kda: { kills: 8, deaths: 2, assists: 6, source: 'opendota' },
      kills: { value: 8, source: 'opendota' }, deaths: { value: 2, source: 'opendota' }, assists: { value: 6, source: 'opendota' },
      lh: { value: 100, source: 'opendota' }, denies: { value: 4, source: 'opendota' }, gpm: { value: 500, source: 'opendota' },
      xpm: { value: 600, source: 'opendota' }, netWorth: { value: 15000, source: 'opendota' }, heroDamage: { value: 20000, source: 'opendota' },
      towerDamage: { value: 1000, source: 'opendota' }, healing: { value: 20, source: 'opendota' }, imp: { value: null, source: null },
    },
    items: { purchases: [{ time: 80, item: { id: 50, name: 'Phase Boots' }, source: 'opendota' }], finalInventory: [{ value: { id: 50, name: 'Phase Boots' }, source: 'opendota' }] },
    events: {
      kills: [], deaths: [{ time: 100, attacker: 8, positionX: 10, positionY: 20, source: 'stratz' }], assists: [], cs: [], purchases: [],
      runes: [{ time: 101, rune: 'HASTE', action: 'PICKUP', source: 'stratz' }], abilityUses: [], itemUses: [], positions: [], repositions: [], teamfights: [], objectives: [],
    },
    series: { gold: { values: [0, 100], source: 'opendota' }, xp: { values: [0, 120], source: 'opendota' }, lh: { values: [0, 1], source: 'opendota' }, denies: { values: [0, 0], source: 'opendota' } },
    patch: { match: { value: '7.40', source: 'valve' }, current: { value: '7.40', source: 'valve' }, isCurrentExactPatch: { value: true, source: 'valve' } },
    phases: [{ id: 'midgame', start: 900, end: 1500, interval: '15–25', metrics: { lhPerMin: 7.4, heroDamagePerMin: 348 }, extremaWithinMatch: ['lhPerMin:max', 'heroDamagePerMin:min'] }],
    baseline: {
      status: 'ready',
      reason: null,
      sameHeroPositionRankPatch: {
        heroId: 107, rankCode: 42, position: 'POSITION_2', bracket: 'CRUSADER_ARCHON', bracketLabel: 'Crusader–Archon',
        bracketSource: 'player_medal',
        patch: '7.40', statistic: 'mean', source: 'stratz', weeks: [2953, 2954],
        points: [{ minute: 10, matchCount: 1200, networth: 3600, cs: 45.5, dn: 6.7, xp: 4300, level: 7.8, kills: 1.4, deaths: 0.9, assists: 0.6, heroDamage: 4400 }],
      },
      comparisons: [
        { metric: 'lastHits', minute: 10, player: 60, baseline: 45.5, delta: 14.5, ratio: 1.319, matchCount: 1200, crossSourceProxy: false, source: 'stratz' },
        { metric: 'netWorth', minute: 10, player: 3200, baseline: 3600, delta: -400, ratio: 0.889, matchCount: 1200, crossSourceProxy: true, source: 'stratz' }, // column check: no comparison sets this flag today
      ],
    },
    deathAnalysis: { contexts: [], patterns: [], priorityDeathTime: null, unresolvedCount: 1 },
    dataQuality: { mode: 'degraded', capabilities: { scoreboard: true, phaseAggregates: true, draft: false, peerBaseline: true, selectedTimeline: true, allPlayerPositions: false, deathContext: false, deathPattern: false, currentPatch: true }, missing: ['complete death context'], warnings: ['Position unavailable'] },
    warnings: ['Position unavailable'],
  };
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'dota-report-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('aggregate-only report localizes metrics without inventing a cause', () => {
  const model = evidenceModel();
  const markdown = renderEvidenceMarkdown({
    request: { matchId: '1', accountId: 2 },
    sources: { opendota: { status: 'ready' }, stratz: { status: 'unavailable' } },
    phases: model.phases,
    dataQuality: model.dataQuality,
  });

  assert.match(markdown, /records facts and unavailable observations/i);
  assert.match(markdown, /without assigning an unrecorded cause/i);
  assert.doesNotMatch(markdown, /farmed instead of|lost tempo|should have rotated/i);
});

test('separates the player medal from the average bracket of the match', () => {
  const markdown = renderEvidenceMarkdown(evidenceModel());

  assert.match(markdown, /| rank (player medal) | 42 — Archon 2 (source: stratz) |/);
  assert.match(markdown, /| rank (match average bracket) | 60 — Ancient (source: stratz) |/);
});

test('names the rank code the baseline bracket was selected by', () => {
  const markdown = renderEvidenceMarkdown(evidenceModel());

  assert.match(markdown, /| bracket chosen from | player_medal (code 42) |/);
});

test('renders the game mode and lobby type with their labels', () => {
  const markdown = renderEvidenceMarkdown(evidenceModel());

  assert.match(markdown, /| gameMode | 22 — All Draft (source: opendota) |/);
  assert.match(markdown, /| lobbyType | 0 — Unranked (source: opendota) |/);
});

test('shows both candidates when a mode vocabulary could not be compared', () => {
  const current = evidenceModel();
  current.match.gameMode = {
    value: null,
    label: null,
    source: null,
    candidates: [{ value: 99, source: 'opendota' }, { value: 'BRAND_NEW_MODE', source: 'stratz' }],
  };

  assert.match(renderEvidenceMarkdown(current), /| gameMode | — (candidates: 99 (opendota), BRAND_NEW_MODE (stratz))/);
});

test('renders an unknown rank code without inventing a label', () => {
  const model = evidenceModel();
  model.player.rank = { value: 99, label: null, source: 'stratz' };

  assert.match(renderEvidenceMarkdown(model), /| 99 — label unknown (source: stratz) |/);
});

test('renderer uses every fixed evidence section for a full model', () => {
  const markdown = renderEvidenceMarkdown(evidenceModel());

  for (const heading of ['Request and sources', 'Match and selected player', 'Participants and actual lane opponents', 'Phases and baseline', 'Death contexts', 'Death patterns and priority time', 'Capabilities, missing, and warnings']) {
    assert.match(markdown, new RegExp(`## ${heading}`));
  }
  assert.match(markdown, /This is an evidence inventory, not the final coaching review/);
});

test('renderer is deterministic for the same normalized model', () => {
  const model = evidenceModel();
  assert.equal(renderEvidenceMarkdown(model), renderEvidenceMarkdown(model));
});

test('writeArtifacts atomically persists only normalized JSON and deterministic Markdown', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  const artifacts = await writeArtifacts(model, directory);

  const expected = projectArtifact(model);
  assert.deepEqual(JSON.parse(await readFile(artifacts.jsonPath, 'utf8')), expected);
  assert.equal(await readFile(artifacts.markdownPath, 'utf8'), renderEvidenceMarkdown(expected));
  assert.equal((await readdir(directory)).some((name) => name.includes('.tmp-')), false);
});

test('writeArtifacts excludes an accidentally attached raw response from persisted artifacts', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.rawApiResponse = { authorization: 'Bearer never-persist-this-token' };

  const artifacts = await writeArtifacts(model, directory);
  const json = await readFile(artifacts.jsonPath, 'utf8');
  const markdown = await readFile(artifacts.markdownPath, 'utf8');

  assert.doesNotMatch(json, /never-persist-this-token/);
  assert.doesNotMatch(markdown, /never-persist-this-token/);
  assert.equal('rawApiResponse' in JSON.parse(json), false);
});

test('writeArtifacts excludes nested raw and credential-like fields from admitted evidence objects', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.sources.stratz.rawApiResponse = { authorization: 'Bearer nested-source-token' };
  model.player.rawToken = 'nested-player-token';
  model.phases[0].metrics.rawTimeline = 'nested-phase-token';
  model.events.deaths[0].authorization = 'Bearer nested-event-token';

  const artifacts = await writeArtifacts(model, directory);
  const json = await readFile(artifacts.jsonPath, 'utf8');
  const persisted = JSON.parse(json);

  assert.doesNotMatch(json, /nested-source-token|nested-player-token|nested-phase-token|nested-event-token/);
  assert.equal('rawApiResponse' in persisted.sources.stratz, false);
  assert.equal('rawToken' in persisted.player, false);
  assert.equal('rawTimeline' in persisted.phases[0].metrics, false);
  assert.equal('events' in persisted, false);
});

test('writeArtifacts persists the canonical v2 entity references and death summary through the allowlist', async (t) => {
  const directory = await temporaryDirectory(t);
  const artifacts = await writeArtifacts(evidenceModel(), directory);
  const persisted = JSON.parse(await readFile(artifacts.jsonPath, 'utf8'));

  assert.equal(persisted.schemaVersion, '2.0.0');
  assert.deepEqual(persisted.draft.radiant, [{ value: { id: 107, name: 'Earth Spirit' }, source: 'opendota' }]);
  assert.deepEqual(persisted.summary.kda, { kills: 8, deaths: 2, assists: 6, source: 'opendota' });
  assert.deepEqual(persisted.items.purchases, [{ time: 80, source: 'opendota', item: { id: 50, name: 'Phase Boots' } }]);
  assert.deepEqual(persisted.series.denies, { values: [0, 0], source: 'opendota' });
  assert.deepEqual(persisted.deathAnalysis, { contexts: [], patterns: [], priorityDeathTime: null, unresolvedCount: 1 });
  assert.equal('events' in persisted, false);
});

test('writeArtifacts preserves explicit capabilities while omitting malformed legacy event timelines', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.events = { deaths: [{ time: { raw: 'not-timed' }, token: 'event-secret' }], positions: [{ x: 1, y: 2 }] };
  model.dataQuality.capabilities.selectedTimeline = true;
  model.dataQuality.mode = 'full';

  const artifacts = await writeArtifacts(model, directory);
  const json = await readFile(artifacts.jsonPath, 'utf8');
  const persisted = JSON.parse(json);

  assert.equal(persisted.dataQuality.capabilities.selectedTimeline, true);
  assert.equal(persisted.dataQuality.mode, 'full');
  assert.equal('events' in persisted, false);
  assert.doesNotMatch(json, /event-secret/);
});

test('writeArtifacts preserves draft and final-inventory alternatives while stripping nested secrets', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.draft.candidates = [
    { source: 'stratz', radiant: [{ value: { id: 11, name: 'Shadow Fiend' }, source: 'stratz', token: 'draft-secret' }], dire: [{ value: { id: 16, name: 'Sand King' }, source: 'stratz' }] },
    { source: 'opendota', radiant: [{ value: { id: 1, name: 'Anti-Mage' }, source: 'opendota' }], dire: [{ value: { id: 6, name: 'Drow Ranger' }, source: 'opendota' }] },
  ];
  model.items.finalInventoryCandidates = [
    { source: 'opendota', items: [{ value: { id: 50, name: 'Phase Boots' }, source: 'opendota', authorization: 'inventory-secret' }] },
    { source: 'stratz', items: [{ value: { id: 150, name: 'Helm of the Dominator' }, source: 'stratz' }] },
  ];

  const artifacts = await writeArtifacts(model, directory);
  const json = await readFile(artifacts.jsonPath, 'utf8');
  const persisted = JSON.parse(json);

  assert.deepEqual(persisted.draft.candidates.map((candidate) => candidate.radiant[0].value.id), [11, 1]);
  assert.deepEqual(persisted.items.finalInventoryCandidates.map((candidate) => candidate.items[0].value.id), [50, 150]);
  assert.doesNotMatch(json, /draft-secret|inventory-secret/);
});

test('writeArtifacts always projects ten deterministic participant slots', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.participants = [{ slot: 0, accountId: 56386500, hero: { id: 107, name: 'Earth Spirit' }, side: 'radiant' }];

  const artifacts = await writeArtifacts(model, directory);
  const persisted = JSON.parse(await readFile(artifacts.jsonPath, 'utf8'));

  assert.equal(persisted.participants.length, 10);
  assert.deepEqual(persisted.participants[0].hero, { id: 107, name: 'Earth Spirit' });
  assert.ok(persisted.participants.slice(1).every((participant) => participant.hero.id === null));
});

test('writeArtifacts rejects nested objects in sourced values and every admitted string-array family', async (t) => {
  const directory = await temporaryDirectory(t);
  const model = evidenceModel();
  model.player.heroId.value = { authorization: 'Bearer sourced-value-token' };
  model.player.position.candidates = [{ value: { token: 'candidate-token' }, source: 'opendota' }];
  model.phases[0].metrics.lhPerMin = { raw: 'metric-token' };
  model.phases[0].extremaWithinMatch.push({ raw: 'extrema-token' });
  model.dataQuality.missing.push({ raw: 'missing-token' });
  model.dataQuality.warnings.push({ raw: 'quality-warning-token' });
  model.warnings.push({ raw: 'top-warning-token' });

  const artifacts = await writeArtifacts(model, directory);
  const json = await readFile(artifacts.jsonPath, 'utf8');
  const persisted = JSON.parse(json);

  assert.doesNotMatch(json, /sourced-value-token|candidate-token|metric-token|extrema-token|missing-token|quality-warning-token|top-warning-token/);
  assert.deepEqual(persisted.phases[0].extremaWithinMatch, ['lhPerMin:max', 'heroDamagePerMin:min']);
  assert.deepEqual(persisted.dataQuality.missing, ['complete death context']);
  assert.deepEqual(persisted.dataQuality.warnings, ['Position unavailable']);
  assert.deepEqual(persisted.warnings, ['Position unavailable']);
});

test('writeArtifacts cleans a same-directory temporary file when final rename fails', async (t) => {
  const directory = await temporaryDirectory(t);
  await mkdir(path.join(directory, '42.md'));

  await assert.rejects(() => writeArtifacts(evidenceModel(), directory));
  assert.equal((await readdir(directory)).some((name) => name.includes('.tmp-')), false);
  assert.equal((await stat(path.join(directory, '42.md'))).isDirectory(), true);
});

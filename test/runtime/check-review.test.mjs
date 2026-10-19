import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { normalizeEvidence } from '../../dota2-match-coach/scripts/lib/normalize.mjs';
import { projectArtifact } from '../../dota2-match-coach/scripts/lib/report.mjs';
import { checkReview } from '../../dota2-match-coach/scripts/check-review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = (name) => JSON.parse(gunzipSync(readFileSync(path.join(root, 'test/fixtures/opendota', name))).toString('utf8'));
const constants = load('constants-heroes-items.json.gz');
const match = load('match-9048031561-parsed.json.gz');
const artifact = projectArtifact(normalizeEvidence({
  matchId: match.match_id, accountId: 56386500, openDota: { status: 'ready', match },
  stratz: { status: 'unavailable', reason: 'missing_token' },
  valve: { status: 'ready', matchPatch: '7.41f', currentPatch: '7.41f', isCurrentExactPatch: true },
  entityConstants: { status: 'ready', missing: [], heroes: constants.heroes, items: constants.items, abilityIds: {}, abilities: {} },
}));

// The quoted reviews in references/examples.md, by section heading.
function examples() {
  const text = readFileSync(path.join(root, 'dota2-match-coach/references/examples.md'), 'utf8');
  const sections = {};
  let current = null;
  for (const line of text.split('\n')) {
    const heading = /^## \d+\. (.+)$/.exec(line);
    if (heading) { current = heading[1]; sections[current] = []; continue; }
    if (current && line.startsWith('>')) sections[current].push(line.replace(/^> ?/, ''));
  }
  return Object.fromEntries(Object.entries(sections).map(([name, lines]) => [name, lines.join('\n')]));
}

test('the example reviews pass the check against the artifact of their match', () => {
  const reviews = examples();
  for (const [name, mode] of [['Full review (default)', 'full'], ['Brief', 'brief'], ['Focused: "как я отстоял лайн?"', 'focused']]) {
    const result = checkReview(reviews[name], artifact, { mode });
    assert.deepEqual(result.errors, [], name);
  }
});

test('flags a timecode, a K/D/A and field names that are not in the artifact', () => {
  const result = checkReview([
    'TL;DR: умер на 12:34 от Silencer.',
    'Skywrath Mage, 6/5/19.',
    'contextIncomplete был true, а firstAlliedDeathInFight показал паттерн у <Hero>.',
    '**Упражнение:** считай смерти.',
  ].join('\n'), artifact);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /timecodes not found in the artifact: 12:34/);
  assert.match(result.errors.join('\n'), /K\/D\/A 6\/5\/19 differs from the artifact's 7\/5\/19/);
  assert.match(result.errors.join('\n'), /internal field names in the prose: contextIncomplete, firstAlliedDeathInFight/);
  assert.match(result.errors.join('\n'), /template placeholder/);
});

test('requires a TL;DR and a labelled drill, and enforces the mode length', () => {
  const result = checkReview(`Просто текст про игру. ${'слово '.repeat(400)}`, artifact, { mode: 'brief' });
  assert.match(result.errors.join('\n'), /TL;DR/);
  assert.match(result.errors.join('\n'), /drill section/);
  assert.match(result.errors.join('\n'), /over the brief limit of 350/);
});

test('accepts whole-minute markers and the duration, and pre-horn times recorded in the artifact', () => {
  const result = checkReview('TL;DR: к 10:00 лайн выигран, игра закончилась на 26:51.\n**Совет тренера:** дави.\n**Упражнение:** считай.', artifact);
  assert.deepEqual(result.errors, []);
});

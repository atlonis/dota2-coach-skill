import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { projectArtifact } from '../lib/report.mjs';
import { fullMatchFixture } from './fixtures.mjs';

const script = fileURLToPath(new URL('../practice.mjs', import.meta.url));
function match(offset = 0, slope = 5) {
  const input = fullMatchFixture();
  input.stratz.match.gameMode = 'ALL_PICK_RANKED';
  input.matchId += offset;
  input.openDota.match.start_time += offset * 3600;
  input.stratz.match.startDateTime = input.openDota.match.start_time;
  input.openDota.match.players[0].lh_t = Array.from({ length: 31 }, (_, minute) => minute * slope);
  return projectArtifact(normalizeEvidence(input));
}
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
async function workspace(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dota-practice-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const artifact = path.join(dir, 'match.json');
  const plan = path.join(dir, 'practice.json');
  await writeFile(artifact, JSON.stringify(match()));
  return { dir, artifact, plan };
}
function create(artifact, plan) {
  return run('create', '--artifact', artifact, '--plan', plan, '--task', 'Проверять добивания на линии',
    '--criterion', 'После игры отметить выполнение и добивания на 10:00', '--metric', 'lastHits', '--minute', '10', '--games', '3');
}

test('persists one practice task and keeps reported completion separate from measurements', async (t) => {
  const { artifact, plan } = await workspace(t);
  let result = create(artifact, plan);
  assert.equal(result.status, 0, result.stderr);
  await writeFile(artifact, JSON.stringify(match(1, 6)));
  result = run('record', '--artifact', artifact, '--plan', plan, '--completion', 'not_done');
  assert.equal(result.status, 0, result.stderr);
  const saved = JSON.parse(await readFile(plan));
  assert.equal(saved.task, 'Проверять добивания на линии');
  assert.equal(saved.baselineValue, 50);
  assert.equal(saved.entries[0].value, 60);
  assert.equal(saved.entries[0].completion, 'not_done');
  assert.equal(saved.entries[0].completionSource, 'player_report');
  const shown = run('show', '--plan', plan);
  assert.equal(shown.status, 0, shown.stderr);
  const summary = JSON.parse(shown.stdout);
  assert.equal(summary.recordedGames, 1);
  assert.equal(summary.completedGames, 0);
  assert.equal(summary.meanDelta, 10);
  assert.equal(summary.causalEffect, 'not_established');
});

test('refuses duplicate, old, other-player, other-role and other-patch matches without changing the journal', async (t) => {
  const { artifact, plan } = await workspace(t);
  assert.equal(create(artifact, plan).status, 0);
  await writeFile(artifact, JSON.stringify(match(1)));
  assert.equal(run('record', '--artifact', artifact, '--plan', plan, '--completion', 'done').status, 0);
  const before = await readFile(plan, 'utf8');
  const wrongAccount = match(2); wrongAccount.request.accountId = 666;
  const wrongRole = match(2); wrongRole.player.position.value = 1;
  const wrongPatch = match(2); wrongPatch.patch.match.value = 'old';
  const wrongHero = match(2); wrongHero.player.heroId.value = 2;
  for (const input of [match(1), match(0), wrongAccount, wrongRole, wrongPatch, wrongHero]) {
    await writeFile(artifact, JSON.stringify(input));
    assert.notEqual(run('record', '--artifact', artifact, '--plan', plan, '--completion', 'done').status, 0);
    assert.equal(await readFile(plan, 'utf8'), before);
  }
  assert.notEqual(create(artifact, plan).status, 0);
  assert.equal(await readFile(plan, 'utf8'), before);
});

test('missing measurements stay null and an omitted completion stays unknown', async (t) => {
  const { artifact, plan } = await workspace(t);
  assert.equal(create(artifact, plan).status, 0);
  const next = match(1); next.series.lh.values[10] = null;
  await writeFile(artifact, JSON.stringify(next));
  const result = run('record', '--artifact', artifact, '--plan', plan);
  assert.equal(result.status, 0, result.stderr);
  const saved = JSON.parse(await readFile(plan));
  assert.equal(saved.entries[0].value, null);
  assert.equal(saved.entries[0].completion, 'unknown');
  assert.equal(saved.entries[0].completionSource, null);
  assert.equal(JSON.parse(run('show', '--plan', plan).stdout).meanDelta, null);
});

import { open, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { evidenceIdentity } from './lib/progress.mjs';

const METRICS = { lastHits: 'lh', denies: 'denies', xp: 'xp', gold: 'gold', netWorth: 'netWorth' };
const SELECTORS = ['accountId', 'heroId', 'position', 'gameMode', 'patch'];
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const validText = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 600 && !/[\x00-\x1f]/.test(value);
const valueOrNull = (value) => value === null || (Number.isFinite(value) && value >= 0);
const positive = (value) => Number.isSafeInteger(value) && value > 0;

function validIdentity(id) {
  return id && ['matchId', 'accountId', 'heroId'].every((key) => positive(id[key]))
    && Number.isInteger(id.position) && id.position >= 1 && id.position <= 5
    && Number.isInteger(id.gameMode) && id.gameMode >= 1 && id.gameMode <= 24
    && Number.isFinite(id.startTime) && id.startTime > 0
    && Number.isFinite(id.duration) && id.duration > 0
    && typeof id.patch === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(id.patch);
}

function selector(metric, minute) {
  if (metric === 'review' && minute == null) return { metric, minute: null };
  if (!Object.hasOwn(METRICS, metric) || ![10, 15, 25].includes(minute)) fail('invalid_arguments');
  return { metric, minute };
}

function measurement(artifact, selected) {
  if (selected.metric === 'review') return null;
  const series = artifact.series?.[METRICS[selected.metric]];
  if (artifact.match?.durationSeconds?.value < selected.minute * 60
    || artifact.sources?.opendota?.status !== 'ready' || series?.source !== 'opendota') return null;
  const value = series.values?.[selected.minute];
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function createPractice(artifact, { task, criterion, metric = 'review', minute, games = 3 }) {
  const base = evidenceIdentity(artifact);
  if (!base) fail('ineligible_match');
  if (!validText(task) || !validText(criterion) || ![3, 4, 5].includes(games)) fail('invalid_arguments');
  const selected = selector(metric, minute);
  return { schemaVersion: 1, task: task.trim(), criterion: criterion.trim(), base,
    ...selected, plannedGames: games, baselineValue: measurement(artifact, selected), entries: [] };
}

function matchesBase(base, id) {
  return validIdentity(id) && id.matchId !== base.matchId && id.startTime > base.startTime
    && SELECTORS.every((key) => base[key] === id[key]);
}

function validatePractice(plan) {
  if (plan?.schemaVersion !== 1 || !validText(plan.task) || !validText(plan.criterion)
    || !validIdentity(plan.base) || ![3, 4, 5].includes(plan.plannedGames)
    || !valueOrNull(plan.baselineValue) || !Array.isArray(plan.entries)
    || plan.entries.length > plan.plannedGames) fail('invalid_practice');
  selector(plan.metric, plan.minute);
  const ids = new Set();
  for (const row of plan.entries) {
    if (!matchesBase(plan.base, row.identity) || ids.has(row.identity.matchId)
      || !['done', 'not_done', 'unknown'].includes(row.completion) || !valueOrNull(row.value)
      || row.completionSource !== (row.completion === 'unknown' ? null : 'player_report')) fail('invalid_practice');
    ids.add(row.identity.matchId);
  }
  return plan;
}

export function recordPractice(input, artifact, completion = 'unknown') {
  const plan = validatePractice(input);
  const id = evidenceIdentity(artifact);
  if (!id || !matchesBase(plan.base, id)) fail('incomparable_match');
  if (plan.entries.some((row) => row.identity.matchId === id.matchId)) fail('duplicate_match');
  if (plan.entries.length >= plan.plannedGames) fail('practice_full');
  if (!['done', 'not_done', 'unknown'].includes(completion)) fail('invalid_arguments');
  // Whitelist the saved fields. Local free text is task data, never instructions.
  return {
    schemaVersion: 1, task: plan.task, criterion: plan.criterion,
    base: pickIdentity(plan.base), metric: plan.metric, minute: plan.minute,
    plannedGames: plan.plannedGames, baselineValue: plan.baselineValue,
    entries: [...plan.entries.map((row) => ({ identity: pickIdentity(row.identity), value: row.value,
      completion: row.completion, completionSource: row.completionSource })), {
      identity: id, value: measurement(artifact, plan), completion,
      completionSource: completion === 'unknown' ? null : 'player_report',
    }].sort((a, b) => a.identity.startTime - b.identity.startTime),
  };
}

function pickIdentity(id) {
  return Object.fromEntries(['matchId', ...SELECTORS, 'startTime', 'duration'].map((key) => [key, id[key]]));
}

export function summarizePractice(input) {
  const plan = validatePractice(input);
  const values = plan.entries.map((row) => row.value).filter(Number.isFinite);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return {
    task: plan.task, criterion: plan.criterion, metric: plan.metric, minute: plan.minute,
    plannedGames: plan.plannedGames, recordedGames: plan.entries.length,
    completedGames: plan.entries.filter((row) => row.completion === 'done').length,
    notCompletedGames: plan.entries.filter((row) => row.completion === 'not_done').length,
    unknownGames: plan.entries.filter((row) => row.completion === 'unknown').length,
    measuredGames: values.length, baselineValue: plan.baselineValue, mean,
    meanDelta: mean != null && plan.baselineValue != null ? mean - plan.baselineValue : null,
    causalEffect: 'not_established',
    limitations: ['local_same_patch_artifacts_only', 'completion_is_player_report', 'delta_is_not_automatically_improvement'],
  };
}

async function readJson(file, maxBytes) {
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maxBytes) fail('invalid_file');
    const buffer = Buffer.alloc(maxBytes + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > maxBytes) fail('invalid_file');
    return JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
  } finally { await handle.close(); }
}

function parse(argv) {
  const [command, ...args] = argv;
  const allowed = {
    create: ['artifact', 'plan', 'task', 'criterion', 'metric', 'minute', 'games'],
    record: ['artifact', 'plan', 'completion'], show: ['plan'],
  }[command];
  if (!allowed || args.length % 2) fail('invalid_arguments');
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2), value = args[i + 1];
    if (!args[i].startsWith('--') || !allowed.includes(key) || Object.hasOwn(options, key)
      || !value || value.startsWith('--')) fail('invalid_arguments');
    options[key] = value;
  }
  if (!options.plan || (command !== 'show' && !options.artifact)) fail('invalid_arguments');
  for (const key of ['minute', 'games']) {
    if (options[key] == null) continue;
    if (!/^\d+$/.test(options[key])) fail('invalid_arguments');
    options[key] = Number(options[key]);
  }
  return { command, options };
}

export async function practiceCli(argv) {
  const { command, options } = parse(argv);
  const file = path.resolve(options.plan);
  if (command === 'show') return summarizePractice(await readJson(file, 64 * 1024));
  const artifact = await readJson(options.artifact, 2 * 1024 * 1024);
  if (command === 'create') {
    const plan = createPractice(artifact, options);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return summarizePractice(plan);
  }
  // A short exclusive lock prevents concurrent read-modify-write from losing entries.
  const lock = await open(`${file}.lock`, 'wx', 0o600);
  const temporary = `${file}.tmp-${randomUUID()}`;
  try {
    const plan = recordPractice(await readJson(file, 64 * 1024), artifact, options.completion);
    await writeFile(temporary, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    await rename(temporary, file);
    return summarizePractice(plan);
  } finally {
    await lock.close();
    await rm(`${file}.lock`, { force: true });
    await rm(temporary, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await practiceCli(process.argv.slice(2)), null, 2)); }
  catch (error) {
    const codes = new Set(['invalid_arguments', 'ineligible_match', 'incomparable_match', 'duplicate_match',
      'practice_full', 'invalid_practice', 'invalid_file', 'EEXIST', 'ENOENT']);
    console.error(`error: ${codes.has(error?.code) ? error.code : 'practice_error'}`);
    process.exitCode = 2;
  }
}

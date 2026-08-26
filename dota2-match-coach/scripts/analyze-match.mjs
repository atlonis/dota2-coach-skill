import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOpenDotaClient } from './lib/opendota.mjs';
import { createStratzClient } from './lib/stratz.mjs';
import { createValveClient } from './lib/valve.mjs';
import { resolveAccountIdByHero } from './lib/heroes.mjs';
import { NormalizationError, normalizeEvidence } from './lib/normalize.mjs';
import { writeArtifacts } from './lib/report.mjs';

const DEFAULT_PARSE_TIMEOUT_MS = 120_000;
const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT_DIR = path.join(SKILL_ROOT, 'output');

export class AnalysisError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

function positiveInteger(value, name) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AnalysisError('invalid_arguments');
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new AnalysisError('invalid_arguments');
  return number;
}

export function parseArgs(argv) {
  const values = { matchId: null, accountId: null, heroName: null, outputDir: null, parseTimeoutMs: DEFAULT_PARSE_TIMEOUT_MS };
  const names = new Map([
    ['--match-id', 'matchId'],
    ['--account-id', 'accountId'],
    ['--hero', 'heroName'],
    ['--output-dir', 'outputDir'],
    ['--parse-timeout-ms', 'parseTimeoutMs'],
  ]);
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const name = names.get(flag);
    if (!name || seen.has(name) || index + 1 >= argv.length) {
      throw new AnalysisError('invalid_arguments');
    }
    const value = argv[index + 1];
    if (typeof value !== 'string' || value.startsWith('--')) throw new AnalysisError('invalid_arguments');
    if (name === 'matchId' || name === 'accountId' || name === 'parseTimeoutMs') {
      values[name] = positiveInteger(value, name);
    } else if (name === 'heroName') {
      if (value.trim().length === 0) throw new AnalysisError('invalid_arguments');
      values[name] = value.trim();
    } else if (value.length > 0) {
      values[name] = value;
    } else {
      throw new AnalysisError('invalid_arguments');
    }
    seen.add(name);
    index += 1;
  }
  if (values.matchId === null || (values.accountId === null && values.heroName === null)) throw new AnalysisError('invalid_arguments');
  return values;
}

function unavailableValve() {
  return { status: 'unavailable', reason: 'opendota_start_time_unavailable' };
}

function normalizedStartTime(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value > 10_000_000_000 ? value / 1_000 : value;
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp / 1_000 : null;
  }
  return null;
}

function hasUsableSource(openDota, stratz) {
  return openDota?.status === 'ready' || stratz?.status === 'ready';
}

export async function runAnalysis(options, { openDotaClient, stratzClient, valveClient, normalize, write } = {}) {
  const parseTimeoutMs = options?.parseTimeoutMs ?? DEFAULT_PARSE_TIMEOUT_MS;
  const outputDir = options?.outputDir ?? DEFAULT_OUTPUT_DIR;
  const openDota = await openDotaClient.loadMatch(options.matchId, { parseTimeoutMs });
  if (openDota?.status === 'not_found') throw new AnalysisError('match_not_found');

  let stratz;
  let valve;
  const openDotaStartTime = normalizedStartTime(openDota?.match?.start_time);
  if (openDotaStartTime != null) {
    valve = await valveClient.resolvePatch(openDotaStartTime);
    stratz = await stratzClient.loadMatch(options.matchId);
  } else {
    stratz = await stratzClient.loadMatch(options.matchId);
    if (!hasUsableSource(openDota, stratz)) throw new AnalysisError('no_usable_source_data');
    const stratzStartTime = normalizedStartTime(stratz?.match?.startDateTime);
    valve = stratzStartTime == null ? unavailableValve() : await valveClient.resolvePatch(stratzStartTime);
  }
  if (!hasUsableSource(openDota, stratz)) throw new AnalysisError('no_usable_source_data');
  if (valve?.status !== 'ready') throw new AnalysisError('patch_unverified');
  if (valve.isCurrentExactPatch !== true) throw new AnalysisError('unsupported_patch');

  let accountId = options.accountId ?? null;
  if (options.heroName != null) {
    const constants = await openDotaClient.loadHeroConstants();
    if (constants?.status !== 'ready') throw new AnalysisError('hero_lookup_unavailable');
    const selected = resolveAccountIdByHero({
      heroName: options.heroName,
      heroConstants: constants.heroes,
      openDota,
      stratz,
    });
    if (accountId != null && accountId !== selected.accountId) throw new AnalysisError('selector_conflict');
    accountId = selected.accountId;
  }

  let model;
  try {
    model = normalize({
      matchId: options.matchId,
      accountId,
      openDota,
      stratz,
      valve,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof NormalizationError) throw new AnalysisError(error.code);
    throw error;
  }
  const artifacts = await write(model, outputDir);
  return { model, artifacts };
}

function defaultDependencies() {
  return {
    openDotaClient: createOpenDotaClient(),
    stratzClient: createStratzClient({ apiKey: process.env.STRATZ_API_KEY }),
    valveClient: createValveClient(),
    normalize: normalizeEvidence,
    write: writeArtifacts,
  };
}

function exitCodeFor(error) {
  if (['invalid_arguments', 'account_not_found', 'account_ambiguous', 'hero_not_found', 'hero_ambiguous', 'hero_account_unavailable', 'hero_lookup_unavailable', 'selector_conflict'].includes(error?.code)) return 2;
  if (error?.code === 'match_not_found') return 3;
  return 4;
}

const SAFE_DIAGNOSTICS = new Set([
  'invalid_arguments', 'account_not_found', 'account_ambiguous', 'match_not_found',
  'hero_not_found', 'hero_ambiguous', 'hero_account_unavailable', 'hero_lookup_unavailable', 'selector_conflict',
  'no_usable_source_data', 'patch_unverified', 'unsupported_patch',
]);

function safeDiagnostic(error) {
  return SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'runtime_error';
}

export async function runCli(argv, { dependencies = defaultDependencies(), stdout = (line) => console.log(line), stderr = (line) => console.error(line) } = {}) {
  try {
    const options = parseArgs(argv);
    const { model, artifacts } = await runAnalysis(options, dependencies);
    for (const source of ['opendota', 'valve', 'stratz']) {
      stdout(`${source}: ${model.sources?.[source]?.status ?? 'unavailable'}`);
    }
    stdout(`json: ${artifacts.jsonPath}`);
    stdout(`markdown: ${artifacts.markdownPath}`);
    return 0;
  } catch (error) {
    stderr(`error: ${safeDiagnostic(error)}`);
    return exitCodeFor(error);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}

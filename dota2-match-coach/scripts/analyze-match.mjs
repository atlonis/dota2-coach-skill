import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOpenDotaClient } from './lib/opendota.mjs';
import { createStratzClient } from './lib/stratz.mjs';
import { createValveClient } from './lib/valve.mjs';
import { createDatafeedClient } from './lib/datafeed.mjs';
import { itemCosts, mechanicsRequest, recipeItemIds } from './lib/mechanics.mjs';
import { bracketBasicFor, createBaselineClient, fullWeeksWithin, positionEnumFor } from './lib/baseline.mjs';
import { heroIdForName } from './lib/heroes.mjs';
import { NormalizationError, normalizeEvidence } from './lib/normalize.mjs';
import { projectArtifact, writeArtifacts } from './lib/report.mjs';
import { buildProgress, loadProgressHistory } from './lib/progress.mjs';
import { buildEpisode } from './lib/episode.mjs';
import { relaunchWithProxySupport } from './lib/proxy.mjs';

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

// A match link from Dotabuff, OpenDota or STRATZ carries the match ID in its path.
export function matchIdFrom(value) {
  const link = typeof value === 'string' ? /^https?:\/\/(?:www\.)?(?:dotabuff\.com|opendota\.com|stratz\.com)\/matches\/(\d+)(?:[/?#].*)?$/i.exec(value.trim()) : null;
  return positiveInteger(link ? link[1] : value, 'matchId');
}

const STEAM64_BASE = 76561197960265728n;
const ACCOUNT_ID_MAX = 4_294_967_295;

// The 32-bit Dota account ID, also from a Steam64 ID or a profile link. A custom
// Steam profile name (/id/<name>) needs the Steam Web API, which the runtime does
// not use, so it is refused with its own code.
export function accountIdFrom(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (/^https?:\/\/(?:www\.)?steamcommunity\.com\/id\//i.test(text)) throw new AnalysisError('account_vanity_unsupported');
  const profile = /^https?:\/\/(?:www\.)?(?:dotabuff\.com|opendota\.com|stratz\.com)\/players\/(\d+)(?:[/?#].*)?$/i.exec(text)
    ?? /^https?:\/\/(?:www\.)?steamcommunity\.com\/profiles\/(\d+)\/?(?:[?#].*)?$/i.exec(text);
  const digits = profile ? profile[1] : text;
  if (!/^[1-9]\d*$/.test(digits)) throw new AnalysisError('invalid_arguments');
  if (digits.length === 17 && digits.startsWith('7656119')) {
    const accountId = BigInt(digits) - STEAM64_BASE;
    if (accountId <= 0n || accountId > BigInt(ACCOUNT_ID_MAX)) throw new AnalysisError('invalid_arguments');
    return Number(accountId);
  }
  const accountId = positiveInteger(digits, 'accountId');
  if (accountId > ACCOUNT_ID_MAX) throw new AnalysisError('invalid_arguments');
  return accountId;
}

export function parseArgs(argv) {
  const values = { matchId: null, accountId: null, heroName: null, outputDir: null, parseTimeoutMs: DEFAULT_PARSE_TIMEOUT_MS };
  const names = new Map([
    ['--match-id', 'matchId'],
    ['--account-id', 'accountId'],
    ['--hero', 'heroName'],
    ['--slot', 'slot'],
    ['--output-dir', 'outputDir'],
    ['--history-dir', 'historyDir'],
    ['--at', 'at'],
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
    if (name === 'matchId') {
      values.matchId = matchIdFrom(value);
    } else if (name === 'accountId') {
      values.accountId = accountIdFrom(value);
    } else if (name === 'parseTimeoutMs') {
      values[name] = positiveInteger(value, name);
    } else if (name === 'slot') {
      // Slots 0-4 are Radiant and 5-9 Dire, in the order of the match scoreboard.
      if (!/^\d$/.test(value)) throw new AnalysisError('invalid_arguments');
      values.slot = Number(value);
    } else if (name === 'at') {
      if (!/^(?:\d+|\d+:[0-5]\d)$/.test(value)) throw new AnalysisError('invalid_arguments');
      const parts = value.split(':').map(Number);
      values.at = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
      if (!Number.isSafeInteger(values.at)) throw new AnalysisError('invalid_arguments');
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
  if (values.matchId === null || (values.accountId === null && values.heroName === null && values.slot == null)) throw new AnalysisError('invalid_arguments');
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

// Why no source could be read, as far as OpenDota's failure tells.
function sourceFailureCode(openDota) {
  const code = openDota?.error?.code;
  if (code === 'rate_limited') return 'source_rate_limited';
  if (code === 'network' || code === 'timeout') return 'source_unreachable';
  return 'no_usable_source_data';
}


// The baseline is collected in a second pass: the hero, position and bracket
// selectors are known only after normalization. Any refusal leaves the baseline capability
// closed and never cancels the match facts already collected.
async function loadBaseline(model, valve, baselineClient, nowSeconds) {
  // Turbo and other non-standard modes are not comparable with STRATZ's
  // normal-game sample, which cannot be filtered by game mode.
  if (['turbo', 'non_standard'].includes(model.match?.modeClass)) return { status: 'unavailable', reason: 'non_standard_mode' };
  const heroId = model.player?.heroId?.value ?? null;
  if (!Number.isInteger(heroId)) return { status: 'unavailable', reason: 'hero_unknown' };
  const position = positionEnumFor(model.player?.position?.value ?? null);
  if (!position) return { status: 'unavailable', reason: 'position_unknown' };
  // The player's own medal is more precise than the match average bracket: in a
  // mixed lobby the average code can sit several buckets above or below the player.
  // The average stays the fallback, and the artifact always names what was used.
  const selectors = [
    { rankCode: model.player?.rank?.value ?? null, bracketSource: 'player_medal' },
    { rankCode: model.match?.averageRank?.value ?? null, bracketSource: 'match_average' },
  ];
  const selector = selectors.find((candidate) => bracketBasicFor(candidate.rankCode));
  if (!selector) return { status: 'unavailable', reason: 'rank_unknown' };
  const bracket = bracketBasicFor(selector.rankCode);
  const weeks = fullWeeksWithin(valve?.currentPatchStartTime, nowSeconds);
  const baseline = await baselineClient.loadPeerBaseline({ heroId, position, bracket: bracket.id, weeks });
  return { ...baseline, rankCode: selector.rankCode, bracketSource: selector.bracketSource };
}

// Mechanics are requested in the same second pass as the baseline: the heroes and
// purchased items are known only after the first normalization. A datafeed failure
// leaves mechanics unavailable and never cancels the match facts.
async function loadMechanics(model, valve, datafeedClient, entityConstants) {
  const request = mechanicsRequest(model, {
    recipeItemIds: recipeItemIds(entityConstants?.items),
    itemCosts: itemCosts(entityConstants?.items),
  });
  if (request.selectedHeroId == null) return { request, reason: 'hero_unknown' };
  try {
    const fetched = await datafeedClient.loadMechanics({ heroIds: request.heroIds, itemIds: request.itemIds, patch: valve?.currentPatch ?? null });
    return { request, fetched };
  } catch {
    return { request, reason: 'datafeed_failed' };
  }
}

export async function runAnalysis(options, { openDotaClient, stratzClient, valveClient, baselineClient, datafeedClient, normalize, write, now = () => Date.now() } = {}) {
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
    if (!hasUsableSource(openDota, stratz)) throw new AnalysisError(sourceFailureCode(openDota));
    const stratzStartTime = normalizedStartTime(stratz?.match?.startDateTime);
    valve = stratzStartTime == null ? unavailableValve() : await valveClient.resolvePatch(stratzStartTime);
  }
  if (!hasUsableSource(openDota, stratz)) throw new AnalysisError(sourceFailureCode(openDota));
  if (valve?.status !== 'ready') throw new AnalysisError('patch_unverified');
  if (valve.isCurrentExactPatch !== true) throw new AnalysisError('unsupported_patch');
  const entityConstants = await openDotaClient.loadEntityConstants();

  // A hero name becomes a hero ID here; normalization then finds the hero's slot,
  // which works even when the player hides their account ID.
  let heroId = null;
  if (options.heroName != null) {
    if (!entityConstants?.heroes || Object.keys(entityConstants.heroes).length === 0) {
      throw new AnalysisError('hero_lookup_unavailable');
    }
    try {
      heroId = heroIdForName(options.heroName, entityConstants.heroes);
    } catch (error) {
      throw new AnalysisError(error?.code ?? 'hero_not_found');
    }
  }
  const selector = { accountId: options.accountId ?? null, slot: options.slot ?? null, heroId };

  let model;
  try {
    model = normalize({
      matchId: options.matchId,
      ...selector,
      openDota,
      stratz,
      valve,
      entityConstants,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof NormalizationError) throw new AnalysisError(error.code);
    throw error;
  }
  if (baselineClient || datafeedClient) {
    const [baseline, mechanics] = await Promise.all([
      baselineClient ? loadBaseline(model, valve, baselineClient, Math.floor(now() / 1_000)) : undefined,
      datafeedClient ? loadMechanics(model, valve, datafeedClient, entityConstants) : undefined,
    ]);
    model = normalize({
      matchId: options.matchId,
      ...selector,
      openDota,
      stratz,
      valve,
      entityConstants,
      baseline,
      mechanics,
      generatedAt: model.generatedAt,
    });
  }
  if (options.historyDir != null) {
    const history = await loadProgressHistory(options.historyDir);
    model.progress = buildProgress(model, history.artifacts);
    model.progress.historyLoad = {
      status: history.status, reason: history.reason,
      skippedFileCount: history.skippedFileCount, truncated: history.truncated,
    };
    if (history.status !== 'ready') {
      model.progress.status = 'unavailable';
      model.progress.reason = history.reason;
    }
  }
  if (options.at != null) model.episode = buildEpisode(projectArtifact(model), options.at);
  const artifacts = await write(model, outputDir);
  return { model, artifacts };
}

function defaultDependencies() {
  return {
    openDotaClient: createOpenDotaClient({ apiKey: process.env.OPENDOTA_API_KEY }),
    stratzClient: createStratzClient({ apiKey: process.env.STRATZ_API_KEY }),
    valveClient: createValveClient(),
    baselineClient: createBaselineClient({ apiKey: process.env.STRATZ_API_KEY }),
    datafeedClient: createDatafeedClient(),
    normalize: normalizeEvidence,
    write: writeArtifacts,
  };
}

const SELECTOR_ERRORS = [
  'invalid_arguments', 'account_vanity_unsupported', 'episode_out_of_match', 'account_not_found', 'account_ambiguous',
  'hero_not_found', 'hero_ambiguous', 'hero_not_in_match', 'slot_empty', 'hero_lookup_unavailable', 'selector_conflict',
];

function exitCodeFor(error) {
  if (SELECTOR_ERRORS.includes(error?.code)) return 2;
  if (error?.code === 'match_not_found') return 3;
  return 4;
}

const SAFE_DIAGNOSTICS = new Set([
  ...SELECTOR_ERRORS, 'match_not_found',
  'no_usable_source_data', 'source_rate_limited', 'source_unreachable', 'patch_unverified', 'unsupported_patch',
]);

// One line the agent can act on, without the raw cause.
const HINTS = new Map([
  ['invalid_arguments', 'Pass --match-id (a number or a Dotabuff/OpenDota/STRATZ match link) and one of --account-id, --hero or --slot.'],
  ['account_vanity_unsupported', 'A custom Steam profile name cannot be resolved; ask for the numeric friend ID, a Steam64 ID or a Dotabuff/OpenDota profile link.'],
  ['account_not_found', 'This account is not in the match; check the match ID or select the player by --hero or --slot.'],
  ['hero_not_found', 'The hero name was not recognised; use the exact English name, for example "Keeper of the Light".'],
  ['hero_not_in_match', 'No player picked that hero in this match; check the hero or the match ID.'],
  ['slot_empty', 'No player in that slot; slots are 0-4 for Radiant and 5-9 for Dire.'],
  ['selector_conflict', 'The account and hero (or slot) name different players; correct one of them.'],
  ['match_not_found', 'OpenDota does not know this match ID; check it, or wait a few minutes if the match just ended.'],
  ['source_rate_limited', 'OpenDota refused requests (rate limit); wait about a minute and run again, or set OPENDOTA_API_KEY.'],
  ['source_unreachable', 'OpenDota could not be reached; check the network. Behind a proxy, set HTTPS_PROXY; the runtime then enables Node proxy support.'],
  ['no_usable_source_data', 'Neither OpenDota nor STRATZ returned usable match data; try again in a few minutes.'],
  ['patch_unverified', 'The Valve patch list could not be read, so the current patch is unverified; try again in a few minutes.'],
  ['unsupported_patch', 'This match is from an earlier patch; the skill reviews only matches on the current exact patch. Ask for a recent match.'],
]);

function safeDiagnostic(error) {
  return SAFE_DIAGNOSTICS.has(error?.code) ? error.code : 'runtime_error';
}

function parseHint(model) {
  const parse = model.sources?.opendota?.parse;
  if (parse?.state === 'timeout' || parse?.state === 'requested') {
    return 'OpenDota is still parsing the replay. Deaths, lane numbers and the timeline need the parse: rerun the same command in 5-10 minutes. A review now can use the scoreboard only.';
  }
  if (parse?.state === 'failed') return 'OpenDota could not parse the replay (it may be unavailable yet or expired); only scoreboard facts exist for this match.';
  return null;
}

export async function runCli(argv, { dependencies = defaultDependencies(), stdout = (line) => console.log(line), stderr = (line) => console.error(line) } = {}) {
  try {
    const options = parseArgs(argv);
    const { model, artifacts } = await runAnalysis(options, dependencies);
    for (const source of ['opendota', 'valve', 'stratz', 'entityConstants']) {
      const summary = model.sources?.[source];
      const parse = source === 'opendota' && summary?.parse?.requested ? ` (parse: ${summary.parse.state})` : '';
      stdout(`${source}: ${summary?.status ?? 'unavailable'}${parse}`);
    }
    stdout(`baseline: ${model.baseline?.status ?? 'unavailable'}`);
    stdout(`mechanics: ${model.mechanics?.status ?? 'unavailable'}`);
    if (model.progress) stdout(`progress: ${model.progress.status}`);
    if (model.match?.modeClass && model.match.modeClass !== 'standard') stdout(`mode: ${model.match.modeClass}`);
    const hint = parseHint(model);
    if (hint) stdout(`hint: ${hint}`);
    stdout(`json: ${artifacts.jsonPath}`);
    stdout(`markdown: ${artifacts.markdownPath}`);
    return 0;
  } catch (error) {
    const code = safeDiagnostic(error);
    stderr(`error: ${code}`);
    if (HINTS.has(code)) stderr(`hint: ${HINTS.get(code)}`);
    return exitCodeFor(error);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = relaunchWithProxySupport() ?? await runCli(process.argv.slice(2));
}

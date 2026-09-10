import { open, opendir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const MINIMUM_PRIOR_MATCHES = 2;
const MINUTES = [10, 15, 25];
const SERIES = [['gold', 'gold'], ['xp', 'xp'], ['lh', 'lastHits'], ['denies', 'denies']];
const OBSERVATIONS = ['isolated', 'afterConfirmedTeleport', 'firstAlliedDeathInFight', 'tradedLocally', 'ownDefensiveItemUsed'];
const PROVIDERS = new Set(['opendota', 'stratz', 'valve']);
const MAX_FILES = 100;
const MAX_ENTRIES = 1000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positiveId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function hasShape(artifact) {
  return record(artifact) && /^2\.\d+\.\d+$/.test(artifact.schemaVersion)
    && record(artifact.request) && record(artifact.player) && record(artifact.match) && record(artifact.patch);
}

function fieldConflict(field) {
  return field?.conflict === true || (Array.isArray(field?.candidates)
    && field.candidates.some((candidate) => candidate?.value != null && candidate.value !== field.value));
}

function knownField(field, providers = ['opendota', 'stratz']) {
  if (!record(field) || field.value == null || !providers.includes(field.source) || fieldConflict(field)) return null;
  return field.value;
}

function identity(artifact) {
  if (!hasShape(artifact)) return null;
  const identityFields = [artifact.player.accountId, artifact.player.heroId, artifact.player.position,
    artifact.match.gameMode, artifact.match.startTime, artifact.match.durationSeconds];
  if (identityFields.some((field) => artifact.sources?.[field?.source]?.status !== 'ready')) return null;
  const accountId = knownField(artifact.player.accountId);
  const heroId = knownField(artifact.player.heroId);
  const position = knownField(artifact.player.position);
  const gameMode = knownField(artifact.match.gameMode);
  const startTime = knownField(artifact.match.startTime);
  const duration = knownField(artifact.match.durationSeconds);
  const patch = knownField(artifact.patch.match, ['valve']);
  const currentPatch = knownField(artifact.patch.current, ['valve']);
  if (!positiveId(artifact.request.matchId) || !positiveId(accountId) || artifact.request.accountId !== accountId
    || !positiveId(heroId) || !Number.isInteger(position) || position < 1 || position > 5
    || !Number.isInteger(gameMode) || gameMode < 1 || gameMode > 24
    || !Number.isFinite(startTime) || startTime <= 0 || !Number.isFinite(duration) || duration <= 0
    || typeof patch !== 'string' || !patch.trim() || patch !== currentPatch
    || knownField(artifact.patch.isCurrentExactPatch, ['valve']) !== true) return null;
  const valve = artifact.sources?.valve;
  if (valve?.status !== 'ready' || (valve.matchPatch != null && valve.matchPatch !== patch)
    || (valve.currentPatch != null && valve.currentPatch !== patch)
    || (valve.isCurrentExactPatch != null && valve.isCurrentExactPatch !== true)) return null;
  const selected = Array.isArray(artifact.participants)
    ? artifact.participants.filter((participant) => participant?.accountId === accountId) : [];
  if (selected.some((participant) => participant.sourceConflict === true)) return null;
  return { matchId: artifact.request.matchId, accountId, heroId, position, gameMode, startTime, duration, patch };
}

function comparable(current, prior) {
  return prior && prior.matchId !== current.matchId && prior.startTime < current.startTime
    && ['accountId', 'heroId', 'position', 'gameMode', 'patch'].every((field) => current[field] === prior[field]);
}

function seriesValue(artifact, identity, key, minute) {
  const series = artifact.series?.[key];
  if (identity.duration < minute * 60 || series?.source !== 'opendota' || artifact.sources?.opendota?.status !== 'ready') return null;
  const value = series.values?.[minute];
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function deathCoverage(artifact, identity, observation) {
  if (artifact.sources?.stratz?.status !== 'ready'
    || artifact.sources?.[artifact.summary?.deaths?.source]?.status !== 'ready') return null;
  const total = knownField(artifact.summary?.deaths);
  const playerTotal = knownField(artifact.player?.deaths);
  const contexts = artifact.deathAnalysis?.contexts;
  if (fieldConflict(artifact.player?.deaths) || !Number.isInteger(total) || total <= 0 || (playerTotal != null && playerTotal !== total)
    || !Array.isArray(contexts) || contexts.length !== total || artifact.deathAnalysis?.unresolvedCount !== 0
    || contexts.some((context) => !Number.isFinite(context?.time) || context.time < 0 || context.time > identity.duration
      || typeof context.observations?.[observation] !== 'boolean')
    || new Set(contexts.map((context) => context.time)).size !== contexts.length) return null;
  const count = contexts.filter((context) => context.observations[observation] === true).length;
  return { count, total, share: count / total };
}

// A descriptive comparison against the player's own prior games, not a judgement
// of skill or an estimate of the effect of an exercise. Missing values stay absent;
// each point gets its own contributing-match count.
export function buildProgress(currentModel, historicalArtifacts = []) {
  const artifacts = Array.isArray(historicalArtifacts) ? historicalArtifacts : [];
  const result = {
    status: 'unavailable', reason: 'insufficient_comparable_history',
    eligibleMatchCount: 0, excludedMatchCount: artifacts.length, minimumPriorMatches: MINIMUM_PRIOR_MATCHES,
    comparisons: [], deathObservations: [], history: [], limitations: ['descriptive_only', 'no_causal_inference'],
  };
  const current = identity(currentModel);
  if (!current) return { ...result, reason: 'current_match_ineligible' };
  const snapshots = new Map();
  for (const artifact of artifacts) {
    if (!hasShape(artifact) || !positiveId(artifact.request.matchId)) continue;
    const snapshotKey = `${artifact.request.matchId}:${artifact.request.accountId}`;
    const signature = JSON.stringify(projectHistory(artifact));
    const existing = snapshots.get(snapshotKey);
    if (existing) existing.conflict ||= existing.signature !== signature;
    else snapshots.set(snapshotKey, { artifact, signature, conflict: false });
  }
  const prior = [];
  for (const { artifact, conflict } of snapshots.values()) {
    if (conflict) continue;
    const id = identity(artifact);
    if (!comparable(current, id)) continue;
    prior.push({ artifact, identity: id });
  }
  prior.sort((left, right) => left.identity.startTime - right.identity.startTime || left.identity.matchId - right.identity.matchId);
  result.eligibleMatchCount = prior.length;
  result.excludedMatchCount -= prior.length;
  result.history = prior.map(({ identity: id }) => ({ matchId: id.matchId, startTime: id.startTime }));
  if (prior.length < MINIMUM_PRIOR_MATCHES) return result;
  for (const minute of MINUTES) {
    for (const [key, metric] of SERIES) {
      const value = seriesValue(currentModel, current, key, minute);
      if (value === null) continue;
      const values = prior.map((row) => seriesValue(row.artifact, row.identity, key, minute)).filter((sample) => sample !== null);
      if (values.length < MINIMUM_PRIOR_MATCHES) continue;
      const mean = values.reduce((sum, sample) => sum + sample / values.length, 0);
      result.comparisons.push({ metric, minute, current: value, mean, delta: value - mean, matchCount: values.length, source: 'opendota' });
    }
  }
  for (const observation of OBSERVATIONS) {
    const currentCoverage = deathCoverage(currentModel, current, observation);
    if (!currentCoverage) continue;
    const coverages = prior.map((row) => deathCoverage(row.artifact, row.identity, observation)).filter(Boolean);
    const priorMatchesWithObservation = coverages.filter((coverage) => coverage.count > 0).length;
    if (coverages.length < MINIMUM_PRIOR_MATCHES || priorMatchesWithObservation < MINIMUM_PRIOR_MATCHES) continue;
    result.deathObservations.push({
      observation, currentCount: currentCoverage.count, currentDeaths: currentCoverage.total,
      priorCount: coverages.reduce((sum, coverage) => sum + coverage.count, 0),
      priorDeaths: coverages.reduce((sum, coverage) => sum + coverage.total, 0),
      priorMatchCount: coverages.length, priorMatchesWithObservation,
      currentShare: currentCoverage.share,
      priorMeanShare: coverages.reduce((sum, coverage) => sum + coverage.share / coverages.length, 0),
    });
  }
  if (result.comparisons.length > 0 || result.deathObservations.length > 0) {
    result.status = 'ready';
    result.reason = null;
  } else result.reason = 'no_comparable_metrics';
  return result;
}

function safeValue(value) {
  if (typeof value === 'boolean' || (Number.isFinite(value))) return value;
  return typeof value === 'string' && value.length <= 80 && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : null;
}

function projectField(field) {
  const projected = { value: safeValue(field?.value), source: PROVIDERS.has(field?.source) ? field.source : null };
  if (fieldConflict(field)) projected.conflict = true;
  return projected;
}

// History is local input, not trusted model state. Only the fields needed above
// survive loading; raw provider responses, arbitrary keys and error text do not.
function projectHistory(artifact) {
  return {
    schemaVersion: artifact.schemaVersion,
    request: { matchId: safeValue(artifact.request.matchId), accountId: safeValue(artifact.request.accountId) },
    player: Object.fromEntries(['accountId', 'heroId', 'position', 'deaths'].map((key) => [key, projectField(artifact.player[key])])),
    match: Object.fromEntries(['gameMode', 'startTime', 'durationSeconds'].map((key) => [key, projectField(artifact.match[key])])),
    patch: Object.fromEntries(['match', 'current', 'isCurrentExactPatch'].map((key) => [key, projectField(artifact.patch[key])])),
    sources: Object.fromEntries([...PROVIDERS].map((provider) => {
      const source = artifact.sources?.[provider];
      return [provider, { status: source?.status === 'ready' ? 'ready' : 'unavailable',
        ...(provider === 'valve' ? Object.fromEntries(['matchPatch', 'currentPatch', 'isCurrentExactPatch'].map((key) => [key, safeValue(source?.[key])])) : {}),
      }];
    })),
    participants: Array.isArray(artifact.participants) ? artifact.participants.slice(0, 10).map((participant) => ({
      accountId: Number.isSafeInteger(participant?.accountId) ? participant.accountId : null,
      sourceConflict: participant?.sourceConflict === true,
    })) : [],
    summary: { deaths: projectField(artifact.summary?.deaths) },
    series: Object.fromEntries(SERIES.map(([key]) => [key, {
      source: artifact.series?.[key]?.source === 'opendota' ? 'opendota' : null,
      values: Array.isArray(artifact.series?.[key]?.values)
        ? artifact.series[key].values.slice(0, 26).map((value) => Number.isFinite(value) ? value : null) : [],
    }])),
    deathAnalysis: {
      unresolvedCount: Number.isInteger(artifact.deathAnalysis?.unresolvedCount) ? artifact.deathAnalysis.unresolvedCount : null,
      contexts: Array.isArray(artifact.deathAnalysis?.contexts) ? artifact.deathAnalysis.contexts.slice(0, 1000).map((context) => ({
        time: Number.isFinite(context?.time) ? context.time : null,
        observations: Object.fromEntries(OBSERVATIONS.map((key) => [key, typeof context?.observations?.[key] === 'boolean' ? context.observations[key] : null])),
      })) : [],
    },
  };
}

export async function loadProgressHistory(directory) {
  const result = { status: 'ready', reason: null, artifacts: [], skippedFileCount: 0, truncated: false };
  const entries = [];
  try {
    if (typeof directory !== 'string' || !directory.trim()) throw new Error('invalid directory');
    const iterator = await opendir(directory);
    let visited = 0;
    for await (const entry of iterator) {
      visited += 1;
      if (visited > MAX_ENTRIES) { result.truncated = true; break; }
      if (!entry.name.toLowerCase().endsWith('.json')) continue;
      if (!entry.isFile()) { result.skippedFileCount += 1; continue; }
      if (entries.length === MAX_FILES) { result.truncated = true; break; }
      entries.push(entry.name);
    }
  } catch {
    return { ...result, status: 'unavailable', reason: 'history_directory_unavailable' };
  }
  let totalBytes = 0;
  for (const filename of entries.sort()) {
    let handle;
    try {
      handle = await open(path.join(directory, filename), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) { result.skippedFileCount += 1; continue; }
      if (totalBytes + stat.size > MAX_TOTAL_BYTES) { result.truncated = true; break; }
      const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      totalBytes += bytesRead;
      if (bytesRead > MAX_FILE_BYTES || totalBytes > MAX_TOTAL_BYTES) { result.skippedFileCount += 1; result.truncated = true; continue; }
      const artifact = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
      if (!hasShape(artifact)) { result.skippedFileCount += 1; continue; }
      result.artifacts.push(projectHistory(artifact));
    } catch {
      result.skippedFileCount += 1;
    } finally {
      await handle?.close().catch(() => {});
    }
  }
  return result;
}

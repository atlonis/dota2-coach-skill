import { SourceError, isTransient, requestJson, withRetry } from './http.mjs';

const DEFAULT_BASE_URL = 'https://api.opendota.com/api';
const HERO_ERROR_CODE = Symbol('heroErrorCode');
// OpenDota's free tier allows 60 requests a minute; polling every second exhausts it within a single parse.
const DEFAULT_POLL_INTERVAL_MS = 5_000;
// An API key raises the limit, so a keyed client can poll faster without risk.
const KEYED_POLL_INTERVAL_MS = 2_000;
const ENTITY_CONSTANT_PATHS = [
  ['heroes', '/constants/heroes'],
  ['items', '/constants/items'],
  ['abilityIds', '/constants/ability_ids'],
  ['abilities', '/constants/abilities'],
];

export function hasReplayData(match) {
  return Number.isInteger(match?.version) && (match.players ?? []).some((player) =>
    ['gold_t', 'xp_t', 'lh_t', 'hero_damage_t', 'purchase_log'].some((key) => Array.isArray(player?.[key])));
}

function getJobId(response) {
  const job = response?.job;
  return job?.jobId ?? response?.jobId ?? response?.id;
}

function makeResult(status, match, parse, error) {
  return error === undefined ? { status, match, parse } : { status, match, parse, error };
}

function validHeroConstants(heroes) {
  if (!heroes || typeof heroes !== 'object' || Array.isArray(heroes)) return false;
  return Object.values(heroes).some((hero) =>
    hero && typeof hero === 'object'
    && Number.isSafeInteger(hero.id) && hero.id > 0
    && [hero.name, hero.localized_name, hero.localizedName].some((name) => typeof name === 'string' && name.trim()));
}

function withApiKey(url, apiKey) {
  if (!apiKey) return url;
  return `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}`;
}

export function createOpenDotaClient({
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  baseUrl = DEFAULT_BASE_URL,
  apiKey,
  retryDelaysMs,
} = {}) {
  const once = (path, options = {}) => requestJson(withApiKey(`${baseUrl}${path}`, apiKey), { fetchImpl, ...options });
  const request = (path, options = {}, deadline = Infinity) => withRetry(() => {
    const remaining = deadline - now();
    if (remaining <= 0) throw new SourceError('parse_timeout', 'Parse request timed out');
    const timeoutMs = Number.isFinite(remaining) ? Math.min(options.timeoutMs ?? remaining, remaining) : options.timeoutMs;
    return once(path, timeoutMs == null ? options : { ...options, timeoutMs });
  }, { sleep, now, deadline, ...(retryDelaysMs ? { delaysMs: retryDelaysMs } : {}) });

  const degraded = (match, parse, error) => makeResult('ready', match, parse, error);
  const timedOut = (error) => error?.code === 'parse_timeout' || error?.code === 'timeout';

  async function loadEntityConstants() {
    let heroErrorCode;
    const settled = await Promise.allSettled(
      ENTITY_CONSTANT_PATHS.map(async ([name, requestPath]) => {
        try {
          return [name, (await request(requestPath)).data];
        } catch (error) {
          if (name === 'heroes') heroErrorCode = error instanceof SourceError ? error.code : 'unknown';
          throw error;
        }
      }),
    );
    const result = {};
    const missing = [];
    for (let index = 0; index < ENTITY_CONSTANT_PATHS.length; index += 1) {
      const name = ENTITY_CONSTANT_PATHS[index][0];
      const entry = settled[index];
      if (entry.status === 'fulfilled' && entry.value[1] && typeof entry.value[1] === 'object') {
        result[name] = entry.value[1];
      } else {
        result[name] = {};
        missing.push(name);
      }
    }
    const loaded = ENTITY_CONSTANT_PATHS.length - missing.length;
    const constants = {
      status: loaded === ENTITY_CONSTANT_PATHS.length ? 'ready' : loaded > 0 ? 'partial' : 'failed',
      missing,
      ...result,
    };
    Object.defineProperty(constants, HERO_ERROR_CODE, { value: heroErrorCode });
    return constants;
  }

  return {
    loadEntityConstants,

    async loadHeroConstants() {
      const constants = await loadEntityConstants();
      if (validHeroConstants(constants.heroes)) return { status: 'ready', heroes: constants.heroes };
      return { status: 'failed', error: { code: constants[HERO_ERROR_CODE] ?? 'invalid_response' } };
    },

    async loadRecentMatches(accountId) {
      return (await request(`/players/${accountId}/recentMatches`)).data;
    },

    // `GET /request/{jobId}` returns the job's queue row while it waits and `null`
    // once the row is gone. The row carries no state field, and the row is deleted
    // both after a successful parse and after the last failed attempt, so `null`
    // means "finished" and only a reloaded match tells which way it went.
    async loadMatch(matchId, { parseTimeoutMs = 30_000, pollIntervalMs = apiKey ? KEYED_POLL_INTERVAL_MS : DEFAULT_POLL_INTERVAL_MS } = {}) {
      const notRequested = { requested: false, state: 'not_requested', jobId: undefined };
      let match;
      try {
        match = (await request(`/matches/${matchId}`)).data;
      } catch (error) {
        if (error instanceof SourceError && error.details.status === 404) {
          return makeResult('not_found', null, notRequested, error);
        }
        return makeResult('failed', null, notRequested, error);
      }

      if (hasReplayData(match)) return makeResult('ready', match, notRequested);

      const deadline = now() + parseTimeoutMs;
      let parseResponse;
      try {
        parseResponse = (await request(`/request/${matchId}`, { method: 'POST' }, deadline)).data;
      } catch (error) {
        return degraded(match, { requested: true, state: timedOut(error) ? 'timeout' : 'unavailable', jobId: undefined }, error);
      }

      const jobId = getJobId(parseResponse);
      const requested = { requested: true, state: 'requested', jobId };
      if (jobId === undefined || jobId === null || jobId === '') {
        return degraded(match, { ...requested, state: 'unavailable' }, new SourceError('parse_unavailable', 'Parse job ID unavailable'));
      }

      const timeout = () => degraded(match, { ...requested, state: 'timeout' }, new SourceError('parse_timeout', 'Parse request timed out'));
      let finished = false;
      while (!finished) {
        const remainingBeforeSleep = deadline - now();
        if (remainingBeforeSleep <= 0) return timeout();
        await sleep(Math.min(pollIntervalMs, remainingBeforeSleep));
        const remainingBeforePoll = deadline - now();
        if (remainingBeforePoll <= 0) return timeout();
        try {
          const job = (await once(`/request/${jobId}`, { timeoutMs: remainingBeforePoll })).data;
          finished = job === null;
        } catch (error) {
          // A refused or failed poll is not a failed parse: the job keeps running
          // on OpenDota's side, so the next tick asks again.
          if (timedOut(error) || isTransient(error)) continue;
          return degraded(match, { ...requested, state: 'unavailable' }, error);
        }
      }

      // The match is reloaded after the job leaves the queue. One more interval
      // covers a response cache that has not caught up with the parse yet.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const parsedMatch = (await request(`/matches/${matchId}`, {}, deadline)).data;
          if (hasReplayData(parsedMatch)) return makeResult('ready', parsedMatch, { ...requested, state: 'completed' });
        } catch (error) {
          return degraded(match, { ...requested, state: timedOut(error) ? 'timeout' : 'unavailable' }, error);
        }
        const remaining = deadline - now();
        if (attempt === 0 && remaining > pollIntervalMs) await sleep(pollIntervalMs);
        else break;
      }
      return degraded(match, { ...requested, state: 'failed' }, new SourceError('parse_failed', 'Parse finished without replay data'));
    },
  };
}

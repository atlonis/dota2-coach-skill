import { SourceError, requestJson } from './http.mjs';

const DEFAULT_BASE_URL = 'https://api.opendota.com/api';
const TERMINAL_STATES = new Set(['completed', 'failed', 'error']);

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

function retryDelayMs(value, now) {
  if (typeof value !== 'string') return null;
  if (/^\d+$/.test(value)) return Number(value) * 1_000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

function validHeroConstants(heroes) {
  if (!heroes || typeof heroes !== 'object' || Array.isArray(heroes)) return false;
  return Object.values(heroes).some((hero) =>
    hero && typeof hero === 'object'
    && Number.isSafeInteger(hero.id) && hero.id > 0
    && [hero.name, hero.localized_name, hero.localizedName].some((name) => typeof name === 'string' && name.trim()));
}

export function createOpenDotaClient({
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  baseUrl = DEFAULT_BASE_URL,
} = {}) {
  const request = (path, options = {}) => requestJson(`${baseUrl}${path}`, { fetchImpl, ...options });

  async function requestWithinDeadline(path, options, deadline) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const remaining = deadline - now();
      if (remaining <= 0) throw new SourceError('parse_timeout', 'Parse request timed out');
      try {
        return await request(path, { ...options, timeoutMs: Math.min(options?.timeoutMs ?? remaining, remaining) });
      } catch (error) {
        if (!(error instanceof SourceError) || error.code !== 'rate_limited') throw error;
        const delay = retryDelayMs(error.details.retryAfter, now());
        const retryRemaining = deadline - now();
        if (delay == null || delay <= 0 || delay >= retryRemaining || attempt === 2) throw error;
        await sleep(delay);
      }
    }
    throw new SourceError('rate_limited', 'OpenDota retry limit reached');
  }

  const degraded = (match, parse, error) => makeResult('ready', match, parse, error);

  return {
    async loadHeroConstants() {
      try {
        const heroes = (await request('/constants/heroes')).data;
        if (!validHeroConstants(heroes)) throw new SourceError('invalid_response', 'Hero constants unavailable');
        return { status: 'ready', heroes };
      } catch (error) {
        const code = error instanceof SourceError ? error.code : 'unknown';
        return { status: 'failed', error: { code } };
      }
    },

    async loadMatch(matchId, { parseTimeoutMs = 30_000, pollIntervalMs = 1_000 } = {}) {
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
        parseResponse = (await requestWithinDeadline(`/request/${matchId}`, { method: 'POST' }, deadline)).data;
      } catch (error) {
        const state = error?.code === 'parse_timeout' || error?.code === 'timeout' ? 'timeout' : 'unavailable';
        return degraded(match, { requested: true, state, jobId: undefined }, error);
      }

      const jobId = getJobId(parseResponse);
      const requested = { requested: true, state: 'requested', jobId };
      if (jobId === undefined || jobId === null || jobId === '') {
        return degraded(match, { ...requested, state: 'unavailable' }, new SourceError('parse_unavailable', 'Parse job ID unavailable'));
      }

      let state = 'requested';
      while (!TERMINAL_STATES.has(state)) {
        const remainingBeforeSleep = deadline - now();
        if (remainingBeforeSleep <= 0) {
          return degraded(match, { ...requested, state: 'timeout' }, new SourceError('parse_timeout', 'Parse request timed out'));
        }
        await sleep(Math.min(pollIntervalMs, remainingBeforeSleep));
        const remainingBeforePoll = deadline - now();
        if (remainingBeforePoll <= 0) {
          return degraded(match, { ...requested, state: 'timeout' }, new SourceError('parse_timeout', 'Parse request timed out'));
        }
        try {
          const job = (await requestWithinDeadline(`/request/${jobId}`, { timeoutMs: remainingBeforePoll }, deadline)).data;
          state = job?.state ?? job?.status ?? 'pending';
        } catch (error) {
          const failedState = error?.code === 'parse_timeout' || error?.code === 'timeout' ? 'timeout' : state;
          return degraded(match, { ...requested, state: failedState }, error);
        }
      }

      if (state !== 'completed') {
        return degraded(match, { ...requested, state }, new SourceError('parse_failed', 'Parse request failed'));
      }

      try {
        const parsedMatch = (await requestWithinDeadline(`/matches/${matchId}`, {}, deadline)).data;
        if (!hasReplayData(parsedMatch)) {
          return degraded(match, { ...requested, state: 'incomplete' }, new SourceError('parse_incomplete', 'Parsed match data unavailable'));
        }
        return makeResult('ready', parsedMatch, { ...requested, state });
      } catch (error) {
        return degraded(match, { ...requested, state }, error);
      }
    },
  };
}

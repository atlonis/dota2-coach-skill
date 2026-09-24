import { SourceError, requestJson } from './http.mjs';

// Valve's dota2.com datafeed: the backend of the official hero, item and patch
// pages. It is undocumented and unversioned, so every response is checked for the
// requested record before use, and each record fails on its own without taking
// the rest of the match mechanics with it.
const DEFAULT_BASE_URL = 'https://www.dota2.com/datafeed';
const DEFAULT_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_BUDGET_MS = 60_000;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function failure(error) {
  return { status: 'failed', error: { code: error instanceof SourceError ? error.code : 'unknown' } };
}

// herodata and itemdata wrap one record as `result.data.<collection>[0]`; a record
// with another id is a wrong answer, not the requested entity.
function singleRecord(data, collection, id) {
  const rows = data?.result?.data?.[collection];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!record(row) || row.id !== id) throw new SourceError('invalid_response', 'Unexpected datafeed record');
  return row;
}

function patchNotesRecord(data, version) {
  if (!record(data) || data.patch_number !== version || data.success === false
    || !['heroes', 'items'].every((key) => data[key] === undefined || Array.isArray(data[key]))) {
    throw new SourceError('invalid_response', 'Unexpected patch notes');
  }
  return data;
}

async function mapWithConcurrency(tasks, concurrency, run) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await run(tasks[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

export function createDatafeedClient({
  fetchImpl = fetch,
  baseUrl = DEFAULT_BASE_URL,
  language = 'english',
  concurrency = DEFAULT_CONCURRENCY,
  budgetMs = DEFAULT_BUDGET_MS,
  now = () => Date.now(),
} = {}) {
  async function get(endpoint, params, deadline) {
    const remaining = deadline - now();
    if (remaining <= 0) throw new SourceError('timeout', 'Datafeed budget exhausted');
    const query = new URLSearchParams({ language, ...params });
    const response = await requestJson(`${baseUrl}/${endpoint}?${query}`, { fetchImpl, timeoutMs: Math.min(REQUEST_TIMEOUT_MS, remaining) });
    return response.data;
  }

  return {
    // One call per run: the heroes of the match, the selected player's items and the
    // current sub-patch notes, fetched under a shared time budget.
    async loadMechanics({ heroIds = [], itemIds = [], patch = null } = {}) {
      const deadline = now() + budgetMs;
      const tasks = [
        ...heroIds.map((id) => ({ kind: 'hero', id })),
        ...itemIds.map((id) => ({ kind: 'item', id })),
        ...(typeof patch === 'string' && patch ? [{ kind: 'patchNotes', id: patch }] : []),
      ];
      const results = await mapWithConcurrency(tasks, Math.max(1, concurrency), async (task) => {
        try {
          if (task.kind === 'hero') {
            return { ...task, status: 'ready', record: singleRecord(await get('herodata', { hero_id: String(task.id) }, deadline), 'heroes', task.id) };
          }
          if (task.kind === 'item') {
            return { ...task, status: 'ready', record: singleRecord(await get('itemdata', { item_id: String(task.id) }, deadline), 'items', task.id) };
          }
          return { ...task, status: 'ready', record: patchNotesRecord(await get('patchnotes', { version: task.id }, deadline), task.id) };
        } catch (error) {
          return { ...task, ...failure(error) };
        }
      });
      return {
        status: 'ready',
        patch,
        heroes: results.filter((row) => row.kind === 'hero'),
        items: results.filter((row) => row.kind === 'item'),
        patchNotes: results.find((row) => row.kind === 'patchNotes') ?? { kind: 'patchNotes', id: patch, status: 'unavailable', reason: 'patch_unknown' },
      };
    },
  };
}

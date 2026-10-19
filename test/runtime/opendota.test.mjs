import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenDotaClient, hasReplayData } from '../../dota2-match-coach/scripts/lib/opendota.mjs';

// The queue row OpenDota returns for a job that is still waiting (svc/store/queue.ts).
const QUEUE_ROW = { id: 1, type: 'parse', timestamp: '2026-10-19T10:00:00.000Z', attempts: 1, data: { match_id: 123 }, next_attempt_time: null, priority: 1, job_key: null };

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('loads and validates the OpenDota hero constants used by hero-name selection', async () => {
  const calls = [];
  const client = createOpenDotaClient({ fetchImpl: async (url) => {
    calls.push(url);
    return jsonResponse({ 107: { id: 107, name: 'npc_dota_hero_earth_spirit', localized_name: 'Earth Spirit' } });
  } });

  assert.equal(typeof client.loadHeroConstants, 'function');
  assert.deepEqual(await client.loadHeroConstants(), {
    status: 'ready',
    heroes: { 107: { id: 107, name: 'npc_dota_hero_earth_spirit', localized_name: 'Earth Spirit' } },
  });
  assert.match(calls[0], /\/constants\/heroes$/);
});

for (const payload of [{}, [], { 107: { localized_name: 'Earth Spirit' } }]) {
  test(`rejects malformed hero constants payload ${JSON.stringify(payload)}`, async () => {
    const client = createOpenDotaClient({ fetchImpl: async () => jsonResponse(payload) });

    const result = await client.loadHeroConstants();

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'invalid_response');
  });
}

test('parsed state requires version and replay-derived player series', () => {
  assert.equal(hasReplayData({ version: 22, players: [{ gold_t: [0, 100] }] }), true);
  assert.equal(hasReplayData({ players: [{ kills: 4 }] }), false);
});

test('returns not_found when the match endpoint returns 404', async () => {
  const client = createOpenDotaClient({ fetchImpl: async () => jsonResponse({}, 404) });

  const result = await client.loadMatch(404);

  assert.equal(result.status, 'not_found');
  assert.equal(result.parse.requested, false);
  assert.equal(result.error.code, 'http');
});

test('returns invalid_response when OpenDota responds with HTML', async () => {
  const client = createOpenDotaClient({
    fetchImpl: async () => new Response('<html>down</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'invalid_response');
});

test('returns rate_limited when the initial OpenDota match fetch stays at 429 after retries', async () => {
  const sleeps = [];
  const client = createOpenDotaClient({ fetchImpl: async () => jsonResponse({}, 429), sleep: async (ms) => { sleeps.push(ms); } });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'rate_limited');
  assert.deepEqual(sleeps, [2_000, 8_000]);
});

test('classifies advertised JSON that cannot be decoded as invalid_response', async () => {
  const client = createOpenDotaClient({
    fetchImpl: async () => new Response('{', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'invalid_response');
});

test('preserves the base scoreboard when the parse deadline elapses before polling', async () => {
  const calls = [];
  const replies = [{ players: [{ account_id: 7 }] }, { jobId: 'job-1' }];
  const client = createOpenDotaClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return jsonResponse(replies.shift());
    },
    sleep: async () => { throw new Error('sleep should not run after timeout'); },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 0, pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.equal(result.match.players[0].account_id, 7);
  assert.equal(result.parse.state, 'timeout');
  assert.equal(result.error.code, 'parse_timeout');
  assert.equal(calls.length, 1);
});

test('caps parse polling sleep to the remaining deadline', async () => {
  const originalNow = Date.now;
  const sleeps = [];
  const replies = [
    { players: [{ account_id: 7 }] },
    { jobId: 'job-1' },
    null,
    { version: 22, players: [{ gold_t: [0, 100] }] },
  ];
  Date.now = () => 1_000;
  try {
    const client = createOpenDotaClient({
      fetchImpl: async () => jsonResponse(replies.shift()),
      sleep: async (ms) => { sleeps.push(ms); },
    });

    const result = await client.loadMatch(123, { parseTimeoutMs: 5, pollIntervalMs: 1_000 });

    assert.equal(result.status, 'ready');
    assert.deepEqual(sleeps, [5]);
  } finally {
    Date.now = originalNow;
  }
});

test('bounds poll HTTP timeout to the remaining parse deadline', async () => {
  const originalNow = Date.now;
  const originalSetTimeout = globalThis.setTimeout;
  const requestTimeouts = [];
  const replies = [
    { players: [{ account_id: 7 }] },
    { jobId: 'job-1' },
    null,
    { version: 22, players: [{ gold_t: [0, 100] }] },
  ];
  Date.now = () => 1_000;
  globalThis.setTimeout = (callback, ms, ...args) => {
    requestTimeouts.push(ms);
    return originalSetTimeout(callback, ms, ...args);
  };
  try {
    const client = createOpenDotaClient({
      fetchImpl: async () => jsonResponse(replies.shift()),
      sleep: async () => {},
    });

    const result = await client.loadMatch(123, { parseTimeoutMs: 5, pollIntervalMs: 1 });

    assert.equal(result.status, 'ready');
    assert.equal(requestTimeouts.at(2), 5);
  } finally {
    Date.now = originalNow;
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('preserves the base scoreboard when OpenDota does not return a parse job ID', async () => {
  const replies = [{ players: [{ account_id: 7 }] }, { job: {} }];
  const client = createOpenDotaClient({ fetchImpl: async () => jsonResponse(replies.shift()) });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'ready');
  assert.equal(result.match.players[0].account_id, 7);
  assert.equal(result.parse.state, 'unavailable');
  assert.equal(result.error.code, 'parse_unavailable');
});

test('reports a failed parse when the job leaves the queue without replay data', async () => {
  const replies = [{ players: [{ account_id: 7, kills: 4 }] }, { jobId: 'job-1' }, null, { players: [{ account_id: 7, kills: 4 }] }, { players: [{ account_id: 7, kills: 4 }] }];
  const client = createOpenDotaClient({ fetchImpl: async () => jsonResponse(replies.shift()), sleep: async () => {} });

  const result = await client.loadMatch(123, { pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.equal(result.match.players[0].kills, 4);
  assert.equal(result.parse.state, 'failed');
  assert.equal(result.error.code, 'parse_failed');
});

test('stops polling as soon as the job leaves the queue, long before the timeout', async () => {
  let now = 0;
  const calls = [];
  const replies = [
    { players: [{ account_id: 7 }] },
    { job: { jobId: 41 } },
    QUEUE_ROW,
    QUEUE_ROW,
    null,
    { version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] },
  ];
  const client = createOpenDotaClient({
    fetchImpl: async (url) => { calls.push(url); return jsonResponse(replies.shift()); },
    now: () => now,
    sleep: async (ms) => { now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 120_000 });

  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.equal(now, 15_000);
  assert.equal(calls.filter((url) => url.endsWith('/request/41')).length, 3);
});

test('keeps polling through a rate-limited poll instead of failing the parse', async () => {
  let now = 0;
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    jsonResponse({ jobId: 'job-1' }),
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } }),
    jsonResponse(null),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 60_000 });

  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
});

test('retries the first match request after a rate limit without Retry-After', async () => {
  const sleeps = [];
  const replies = [
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } }),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({ fetchImpl: async () => replies.shift(), sleep: async (ms) => { sleeps.push(ms); } });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'ready');
  assert.deepEqual(sleeps, [2_000]);
});

test('retries a 503 and passes an API key without exposing it elsewhere', async () => {
  const urls = [];
  const replies = [
    jsonResponse({}, 503),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    apiKey: 'k-123',
    fetchImpl: async (url) => { urls.push(url); return replies.shift(); },
    sleep: async () => {},
  });

  const result = await client.loadMatch(123);

  assert.equal(result.status, 'ready');
  assert.deepEqual(urls, ['https://api.opendota.com/api/matches/123?api_key=k-123', 'https://api.opendota.com/api/matches/123?api_key=k-123']);
  assert.doesNotMatch(JSON.stringify(result.parse), /k-123/);
});

test('honors an integer Retry-After inside the parse deadline', async () => {
  const sleeps = [];
  let now = 1_000;
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '2' } }),
    jsonResponse({ jobId: 'job-1' }),
    jsonResponse(null),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 5_000, pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.deepEqual(sleeps, [2_000, 1]);
});

test('honors an HTTP-date Retry-After inside the parse deadline', async () => {
  const sleeps = [];
  let now = Date.parse('2026-08-26T10:00:00.000Z');
  const retryAt = new Date(now + 2_000).toUTCString();
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json', 'retry-after': retryAt } }),
    jsonResponse({ jobId: 'job-1' }),
    jsonResponse(null),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 5_000, pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.deepEqual(sleeps, [2_000, 1]);
});

test('fails safely without waiting for a Retry-After beyond the parse deadline', async () => {
  const sleeps = [];
  let now = 1_000;
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '10' } }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 5_000, pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.equal(result.match.players[0].account_id, 7);
  assert.equal(result.error.code, 'rate_limited');
  assert.deepEqual(sleeps, []);
});

test('falls back to the default delay when Retry-After is unreadable', async () => {
  const sleeps = [];
  let now = 1_000;
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    new Response('{}', { status: 429, headers: { 'content-type': 'application/json', 'retry-after': 'nonsense' } }),
    jsonResponse({ jobId: 'job-1' }),
    jsonResponse(null),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 5_000, pollIntervalMs: 1 });

  assert.equal(result.status, 'ready');
  assert.deepEqual(sleeps, [2_000, 1]);
});

test('polls the parse job every five seconds by default, within the free rate limit', async () => {
  const sleeps = [];
  let now = 0;
  const replies = [
    jsonResponse({ players: [{ account_id: 7 }] }),
    jsonResponse({ jobId: 'job-1' }),
    jsonResponse(QUEUE_ROW),
    jsonResponse(null),
    jsonResponse({ version: 22, players: [{ account_id: 7, gold_t: [0, 1] }] }),
  ];
  const client = createOpenDotaClient({
    fetchImpl: async () => replies.shift(),
    now: () => now,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });

  const result = await client.loadMatch(123, { parseTimeoutMs: 60_000 });

  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.deepEqual(sleeps, [5_000, 5_000]);
});

test('requests parse, polls job, then reloads the match', async () => {
  const calls = [];
  const replies = [
    { players: [{ account_id: 7 }] },
    { job: { jobId: 'job-1' } },
    null,
    { version: 22, players: [{ account_id: 7, gold_t: [0, 100] }] },
  ];
  const fetchImpl = async (url, options = {}) => {
    calls.push([url, options.method ?? 'GET']);
    return new Response(JSON.stringify(replies.shift()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = createOpenDotaClient({ fetchImpl, sleep: async () => {} });
  const result = await client.loadMatch(123, { parseTimeoutMs: 1000, pollIntervalMs: 1 });
  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.deepEqual(calls.map(([, method]) => method), ['GET', 'POST', 'GET', 'GET']);
});

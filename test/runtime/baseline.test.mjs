import test from 'node:test';
import assert from 'node:assert/strict';
import { bracketBasicFor, bracketLabelFor, createBaselineClient, fullWeeksWithin, mergeWeeklyCurves, positionEnumFor } from '../../dota2-match-coach/scripts/lib/baseline.mjs';

const WEEK = 604_800;

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('collapses a medal code into the four-bucket bracket STRATZ actually filters by', () => {
  assert.equal(bracketBasicFor(11).id, 'HERALD_GUARDIAN');
  assert.equal(bracketBasicFor(25).id, 'HERALD_GUARDIAN');
  assert.equal(bracketBasicFor(42).id, 'CRUSADER_ARCHON');
  assert.equal(bracketBasicFor(60).id, 'LEGEND_ANCIENT');
  assert.equal(bracketBasicFor(80).id, 'DIVINE_IMMORTAL');
  assert.equal(bracketLabelFor('LEGEND_ANCIENT'), 'Legend–Ancient');
  assert.equal(bracketBasicFor(99), null);
  assert.equal(bracketBasicFor(null), null);
});

test('maps only real positions to the position enum', () => {
  assert.equal(positionEnumFor(2), 'POSITION_2');
  assert.equal(positionEnumFor(5), 'POSITION_5');
  for (const value of [0, 6, null, '2', 2.5]) assert.equal(positionEnumFor(value), null);
});

test('keeps only weeks lying entirely inside the current patch', () => {
  const patchStart = 2953 * WEEK;
  assert.deepEqual(fullWeeksWithin(patchStart, 2956 * WEEK), [2953, 2954, 2955]);
  // Патч начался в середине недели 2953, поэтому эта неделя смешала бы два патча.
  assert.deepEqual(fullWeeksWithin(patchStart + 1, 2956 * WEEK), [2954, 2955]);
  assert.deepEqual(fullWeeksWithin(patchStart, 2956 * WEEK - 1), [2953, 2954]);
});

test('returns no week when the current patch has no complete week yet', () => {
  const patchStart = 2955 * WEEK + 10;
  assert.deepEqual(fullWeeksWithin(patchStart, 2956 * WEEK + 100), []);
  assert.deepEqual(fullWeeksWithin(null, 2956 * WEEK), []);
});

test('caps the requested window to the most recent weeks', () => {
  assert.deepEqual(fullWeeksWithin(2940 * WEEK, 2956 * WEEK, { maxWeeks: 3 }), [2953, 2954, 2955]);
});

test('weights weekly means by their own sample size and keeps a per-minute match count', () => {
  const merged = mergeWeeklyCurves([
    [{ time: 10, matchCount: 100, cs: 40, networth: 3000 }, { time: 25, matchCount: 50, cs: 150 }],
    [{ time: 10, matchCount: 300, cs: 48, networth: 3800 }],
  ]);

  assert.deepEqual(merged, [
    { minute: 10, matchCount: 400, cs: 46, networth: 3600 },
    { minute: 25, matchCount: 50, cs: 150 },
  ]);
});

test('drops rows without a usable minute or sample size', () => {
  assert.deepEqual(mergeWeeklyCurves([[
    { time: null, matchCount: 100, cs: 40 },
    { time: 10, matchCount: 0, cs: 40 },
    { time: 200, matchCount: 100, cs: 40 },
    null,
  ]]), []);
});

test('does not call STRATZ without a token', async () => {
  const client = createBaselineClient({ apiKey: null, fetchImpl: () => { throw new Error('must not fetch'); } });

  assert.deepEqual(await client.loadPeerBaseline({ heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953] }), {
    status: 'unavailable', reason: 'missing_token',
  });
});

test('refuses to query without a full week inside the current patch', async () => {
  const client = createBaselineClient({ apiKey: 'token', fetchImpl: () => { throw new Error('must not fetch'); } });

  assert.deepEqual(await client.loadPeerBaseline({ heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [] }), {
    status: 'unavailable', reason: 'no_full_week_in_current_patch',
  });
});

test('sends exact STRATZ headers and one aliased request per week', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return jsonResponse({ data: { heroStats: {
      w0: [{ time: 10, matchCount: 100, cs: 40 }],
      w1: [{ time: 10, matchCount: 300, cs: 48 }],
    } } });
  };

  const result = await createBaselineClient({ apiKey: 'token', fetchImpl }).loadPeerBaseline({
    heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953, 2954],
  });

  assert.equal(request.options.headers['User-Agent'], 'STRATZ_API');
  assert.equal(request.options.headers.Authorization, 'Bearer token');
  const body = JSON.parse(request.options.body);
  assert.match(body.query, /w0: stats\(heroIds: \[25\], positionIds: \[POSITION_2\], bracketBasicIds: \[LEGEND_ANCIENT\]/);
  assert.match(body.query, new RegExp(`week: ${2953 * WEEK}`));
  assert.match(body.query, new RegExp(`week: ${2954 * WEEK}`));
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.points, [{ minute: 10, matchCount: 400, cs: 46 }]);
});

test('reports an empty sample instead of a ready baseline', async () => {
  const fetchImpl = async () => jsonResponse({ data: { heroStats: { w0: [] } } });

  assert.deepEqual(await createBaselineClient({ apiKey: 'token', fetchImpl }).loadPeerBaseline({
    heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953],
  }), { status: 'unavailable', reason: 'empty_sample' });
});

test('redacts a GraphQL failure and survives a malformed payload', async () => {
  const failing = createBaselineClient({ apiKey: 'token', fetchImpl: async () => jsonResponse({ errors: [{ message: 'Bearer leaked-token' }] }) });
  assert.deepEqual(await failing.loadPeerBaseline({ heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953] }), {
    status: 'failed', error: { code: 'graphql' },
  });

  const malformed = createBaselineClient({ apiKey: 'token', fetchImpl: async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }) });
  const result = await malformed.loadPeerBaseline({ heroId: 25, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953] });
  assert.equal(result.status, 'failed');
  assert.equal(typeof result.error.code, 'string');
});

test('sums sample counters instead of averaging them', () => {
  const merged = mergeWeeklyCurves([
    [{ time: 10, matchCount: 40_000, winCount: 20_400, cs: 40 }],
    [{ time: 10, matchCount: 60_000, winCount: 29_100, cs: 45 }],
  ]);

  assert.deepEqual(merged, [{ minute: 10, matchCount: 100_000, winCount: 49_500, cs: 43 }]);
});

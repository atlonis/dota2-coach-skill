import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatafeedClient } from '../lib/datafeed.mjs';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function feed(overrides = {}) {
  const requests = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    requests.push(`${parsed.pathname.split('/').pop()}?${parsed.searchParams}`);
    const handler = overrides[parsed.pathname.split('/').pop()];
    if (handler) return handler(parsed);
    if (parsed.pathname.endsWith('/herodata')) {
      const id = Number(parsed.searchParams.get('hero_id'));
      return json({ result: { data: { heroes: [{ id, name_loc: `Hero ${id}` }] }, status: 1 } });
    }
    if (parsed.pathname.endsWith('/itemdata')) {
      const id = Number(parsed.searchParams.get('item_id'));
      return json({ result: { data: { items: [{ id, name_loc: `Item ${id}` }] }, status: 1 } });
    }
    return json({ patch_number: parsed.searchParams.get('version'), heroes: [], items: [], success: true });
  };
  return { requests, fetchImpl };
}

test('requests the match heroes, the selected items and the current patch notes in English', async () => {
  const { requests, fetchImpl } = feed();
  const client = createDatafeedClient({ fetchImpl, baseUrl: 'https://feed.invalid/datafeed' });

  const result = await client.loadMechanics({ heroIds: [107, 1], itemIds: [267], patch: '7.41f' });

  assert.deepEqual(requests.sort(), [
    'herodata?language=english&hero_id=1',
    'herodata?language=english&hero_id=107',
    'itemdata?language=english&item_id=267',
    'patchnotes?language=english&version=7.41f',
  ]);
  assert.deepEqual(result.heroes.map((row) => [row.id, row.status, row.record.name_loc]), [[107, 'ready', 'Hero 107'], [1, 'ready', 'Hero 1']]);
  assert.equal(result.items[0].record.id, 267);
  assert.equal(result.patchNotes.status, 'ready');
  assert.equal(result.patch, '7.41f');
});

test('fails one record at a time on a wrong id, an HTTP error or a malformed envelope', async () => {
  const { fetchImpl } = feed({
    herodata: (url) => (url.searchParams.get('hero_id') === '2'
      ? json({ result: { data: { heroes: [{ id: 3 }] } } })
      : json({ error: 'busy' }, 503)),
    itemdata: () => json({ result: { data: {} } }),
    patchnotes: () => json({ patch_number: '7.41e', heroes: [], success: true }),
  });
  const client = createDatafeedClient({ fetchImpl, baseUrl: 'https://feed.invalid/datafeed' });

  const result = await client.loadMechanics({ heroIds: [2, 4], itemIds: [1], patch: '7.41f' });

  assert.deepEqual(result.heroes.map((row) => [row.id, row.status, row.error.code]), [[2, 'failed', 'invalid_response'], [4, 'failed', 'http']]);
  assert.deepEqual([result.items[0].status, result.items[0].error.code], ['failed', 'invalid_response']);
  assert.deepEqual([result.patchNotes.status, result.patchNotes.error.code], ['failed', 'invalid_response']);
  assert.equal(JSON.stringify(result).includes('busy'), false);
});

test('stops starting requests once the time budget is spent', async () => {
  let clock = 0;
  const { requests, fetchImpl } = feed();
  const client = createDatafeedClient({
    fetchImpl: async (url) => { clock += 40; return fetchImpl(url); },
    baseUrl: 'https://feed.invalid/datafeed', concurrency: 1, budgetMs: 100, now: () => clock,
  });

  const result = await client.loadMechanics({ heroIds: [1, 2, 3, 4], patch: null });

  assert.equal(requests.length, 3);
  assert.deepEqual(result.heroes.map((row) => row.status), ['ready', 'ready', 'ready', 'failed']);
  assert.equal(result.heroes[3].error.code, 'timeout');
  assert.deepEqual([result.patchNotes.status, result.patchNotes.reason], ['unavailable', 'patch_unknown']);
});

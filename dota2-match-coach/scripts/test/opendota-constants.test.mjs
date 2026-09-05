import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenDotaClient } from '../lib/opendota.mjs';

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('loads all entity constant groups', async () => {
  const payloads = new Map([
    ['/constants/heroes', { 90: { id: 90, localized_name: 'Keeper of the Light' } }],
    ['/constants/items', { force_staff: { id: 102, dname: 'Force Staff' } }],
    ['/constants/ability_ids', { 5478: 'keeper_of_the_light_illuminate' }],
    ['/constants/abilities', { keeper_of_the_light_illuminate: { dname: 'Illuminate' } }],
  ]);
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => response(payloads.get(new URL(url).pathname.replace('/api', ''))),
  });
  const result = await client.loadEntityConstants();
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.missing, []);
});

test('returns partial constants and safe missing names', async () => {
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/heroes')) return response({ 90: { id: 90, localized_name: 'Keeper of the Light' } });
      return response({ error: 'unavailable' }, 503);
    },
  });
  const result = await client.loadEntityConstants();
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.missing.sort(), ['abilities', 'abilityIds', 'items']);
  assert.equal(result.heroes[90].id, 90);
  assert.equal(Object.hasOwn(result, 'rawResponses'), false);
});

test('returns failed constants with stable empty groups when all requests fail', async () => {
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async () => response({ error: 'unavailable' }, 503),
  });
  const result = await client.loadEntityConstants();
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.missing, ['heroes', 'items', 'abilityIds', 'abilities']);
  assert.deepEqual(result.heroes, {});
  assert.deepEqual(result.items, {});
  assert.deepEqual(result.abilityIds, {});
  assert.deepEqual(result.abilities, {});
  assert.equal(Object.hasOwn(result, 'rawResponses'), false);
});

test('preserves the safe heroes request error code in loadHeroConstants', async () => {
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => new URL(url).pathname.endsWith('/heroes')
      ? response({ error: 'forbidden' }, 403)
      : response({}),
  });
  const result = await client.loadHeroConstants();
  assert.deepEqual(result, { status: 'failed', error: { code: 'auth' } });
});

test('keeps invalid_response for malformed heroes constants', async () => {
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => new URL(url).pathname.endsWith('/heroes')
      ? response({ malformed: true })
      : response({}),
  });
  const result = await client.loadHeroConstants();
  assert.deepEqual(result, { status: 'failed', error: { code: 'invalid_response' } });
});

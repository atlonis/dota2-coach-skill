import test from 'node:test';
import assert from 'node:assert/strict';
import { createValveClient } from '../../scripts/lib/valve.mjs';

test('resolves the match patch and exact current subpatch from timestamps', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    success: 1,
    patches: [
      { patch_number: '7.41d', patch_timestamp: 1780556400 },
      { patch_number: '7.41e', patch_timestamp: 1785394800 },
    ],
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const result = await createValveClient({ fetchImpl }).resolvePatch(1785400000);

  assert.deepEqual(result, {
    status: 'ready', matchPatch: '7.41e', currentPatch: '7.41e', isCurrentExactPatch: true,
  });
});

test('sorts an unsorted timeline and keeps an older match outside the exact-patch gate', async () => {
  const fetchImpl = async () => jsonResponse({
    success: 1,
    patches: [
      { patch_number: '7.41e', patch_timestamp: 1785394800 },
      { patch_number: '7.41d', patch_timestamp: 1780556400 },
    ],
  });

  const result = await createValveClient({ fetchImpl }).resolvePatch(1781000000);

  assert.deepEqual(result, {
    status: 'ready', matchPatch: '7.41d', currentPatch: '7.41e', isCurrentExactPatch: false,
  });
});

test('returns no match patch when the match predates every known patch', async () => {
  const fetchImpl = async () => jsonResponse({
    success: 1,
    patches: [{ patch_number: '7.41e', patch_timestamp: 1785394800 }],
  });

  const result = await createValveClient({ fetchImpl }).resolvePatch(1780000000);

  assert.deepEqual(result, {
    status: 'ready', matchPatch: null, currentPatch: '7.41e', isCurrentExactPatch: false,
  });
});

test('closes the patch gate when Valve returns invalid JSON', async () => {
  const client = createValveClient({
    fetchImpl: async () => new Response('{', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  const result = await client.resolvePatch(1785400000);

  assert.deepEqual(result, { status: 'failed', error: { code: 'invalid_response' } });
});

test('closes the patch gate when Valve returns an HTTP error', async () => {
  const client = createValveClient({ fetchImpl: async () => jsonResponse({}, 503) });

  const result = await client.resolvePatch(1785400000);

  assert.deepEqual(result, { status: 'failed', error: { code: 'http' } });
});

test('closes the patch gate when Valve omits the patch timeline', async () => {
  const client = createValveClient({ fetchImpl: async () => jsonResponse({ success: 1 }) });

  const result = await client.resolvePatch(1785400000);

  assert.deepEqual(result, { status: 'failed', error: { code: 'invalid_response' } });
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

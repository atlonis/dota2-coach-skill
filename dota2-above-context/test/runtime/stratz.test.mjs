import test from 'node:test';
import assert from 'node:assert/strict';
import { createStratzClient } from '../../scripts/lib/stratz.mjs';

test('sends exact STRATZ headers and returns match data', async () => {
  let captured;
  const fetchImpl = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ data: { match: { id: 123, players: [] } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await createStratzClient({ apiKey: 'secret', fetchImpl }).loadMatch(123);

  assert.equal(captured.method, 'POST');
  assert.equal(captured.headers['Content-Type'], 'application/json');
  assert.equal(captured.headers['User-Agent'], 'STRATZ_API');
  assert.equal(captured.headers.Authorization, 'Bearer secret');
  assert.deepEqual(JSON.parse(captured.body).variables, { matchId: 123 });
  assert.match(JSON.parse(captured.body).query, /pickBans \{ isPick heroId order bannedHeroId isRadiant playerIndex \}/);
  assert.match(JSON.parse(captured.body).query, /playbackData \{/);
  assert.match(JSON.parse(captured.body).query, /runeEvents \{ time rune action gold positionX positionY \}/);
  assert.equal(result.status, 'ready');
});

test('does not call STRATZ without a token', async () => {
  const result = await createStratzClient({ apiKey: '' }).loadMatch(123);

  assert.deepEqual(result, { status: 'unavailable', reason: 'missing_token' });
});

test('redacts GraphQL errors to invalid field names', async () => {
  const client = createStratzClient({
    apiKey: 'token-value',
    fetchImpl: async () => jsonResponse({
      errors: [{ message: 'Cannot query field "legacyField" on type "Match".' }],
    }),
  });

  const result = await client.loadMatch(123);

  assert.deepEqual(result, {
    status: 'failed',
    error: { code: 'graphql', fields: ['legacyField'] },
  });
  assert.doesNotMatch(JSON.stringify(result), /token-value/);
});

for (const [status, code] of [[401, 'auth'], [403, 'auth'], [429, 'rate_limited']]) {
  test(`returns a safe ${code} result for HTTP ${status}`, async () => {
    const client = createStratzClient({ apiKey: 'secret', fetchImpl: async () => jsonResponse({}, status) });

    const result = await client.loadMatch(123);

    assert.deepEqual(result, { status: 'failed', error: { code } });
    assert.doesNotMatch(JSON.stringify(result), /secret/i);
  });
}

test('returns invalid_response when STRATZ responds with HTML', async () => {
  const client = createStratzClient({
    apiKey: 'secret',
    fetchImpl: async () => new Response('<html>Cloudflare</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  });

  const result = await client.loadMatch(123);

  assert.deepEqual(result, { status: 'failed', error: { code: 'invalid_response' } });
  assert.doesNotMatch(JSON.stringify(result), /secret/i);
});

test('returns not_found when GraphQL returns a null match', async () => {
  const client = createStratzClient({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({ data: { match: null } }),
  });

  assert.deepEqual(await client.loadMatch(123), { status: 'not_found' });
});

test('returns invalid_response for a malformed GraphQL payload', async () => {
  const client = createStratzClient({
    apiKey: 'secret',
    fetchImpl: async () => jsonResponse({ data: { match: [] } }),
  });

  assert.deepEqual(await client.loadMatch(123), {
    status: 'failed',
    error: { code: 'invalid_response' },
  });
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

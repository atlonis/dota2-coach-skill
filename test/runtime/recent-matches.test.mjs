import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describeRecentMatches, parseRecentArgs, runRecent } from '../../dota2-match-coach/scripts/recent-matches.mjs';
import { relaunchWithProxySupport } from '../../dota2-match-coach/scripts/lib/proxy.mjs';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/opendota');
const load = (name) => JSON.parse(gunzipSync(readFileSync(path.join(fixtures, name))).toString('utf8'));
// A real /players/56386500/recentMatches response, fetched on 2026-10-19.
const recent = load('recent-56386500.json.gz');
const { heroes } = load('constants-heroes-items.json.gz');
const PATCH_741F = 1789455600;

test('accepts the same account forms as the analysis and caps the list', () => {
  assert.deepEqual(parseRecentArgs(['--account-id', '76561198016652228']), { accountId: 56386500, limit: 10 });
  assert.deepEqual(parseRecentArgs(['--account-id', 'https://www.opendota.com/players/56386500', '--limit', '50']), { accountId: 56386500, limit: 20 });
  assert.throws(() => parseRecentArgs([]), /invalid_arguments/);
  assert.throws(() => parseRecentArgs(['--account-id', 'https://steamcommunity.com/id/x']), /account_vanity_unsupported/);
});

test('describes real recent matches: hero, result, parse state, Turbo and the current patch', () => {
  const rows = describeRecentMatches(recent, { heroes, currentPatchStartTime: PATCH_741F });
  assert.equal(rows.length, recent.length);
  const first = rows.find((row) => row.matchId === 9048031561);
  assert.deepEqual([first.hero, first.result, first.parsed, first.currentPatch], ['Skywrath Mage', 'win', true, true]);
  assert.ok(rows.some((row) => row.parsed === false));
  assert.ok(rows.some((row) => row.mode.includes('(turbo)')));
});

test('prints a table an agent can pick a match from', async () => {
  const lines = [];
  const code = await runRecent(['--account-id', '56386500', '--limit', '3'], {
    openDotaClient: { loadRecentMatches: async () => recent, loadHeroConstants: async () => ({ status: 'ready', heroes }) },
    valveClient: { resolvePatch: async () => ({ status: 'ready', currentPatch: '7.41f', currentPatchStartTime: PATCH_741F }) },
    stdout: (line) => lines.push(line),
    stderr: () => {},
  });
  assert.equal(code, 0);
  assert.equal(lines[0], 'current patch: 7.41f');
  assert.equal(lines.length, 3 + 3);
  assert.match(lines[3], /^\| 9048031561 \| .* \| Skywrath Mage \| win \| 7\/5\/19 \| 26:51 \| All Draft \| yes \| yes \|$/);
});

test('restarts once with Node proxy support only when a proxy is set and support is off', () => {
  const calls = [];
  const spawn = (command, args, options) => { calls.push(options.env.NODE_USE_ENV_PROXY); return { status: 7 }; };
  const argv = ['node', 'script.mjs', '--x'];
  assert.equal(relaunchWithProxySupport({ env: {}, execArgv: [], argv, spawn }), null);
  assert.equal(relaunchWithProxySupport({ env: { HTTPS_PROXY: 'http://proxy:3128', NODE_USE_ENV_PROXY: '1' }, execArgv: [], argv, spawn }), null);
  assert.equal(relaunchWithProxySupport({ env: { HTTPS_PROXY: 'http://proxy:3128' }, execArgv: ['--use-env-proxy'], argv, spawn }), null);
  assert.equal(relaunchWithProxySupport({ env: { https_proxy: 'http://proxy:3128' }, execArgv: [], argv, spawn }), 7);
  assert.deepEqual(calls, ['1']);
});

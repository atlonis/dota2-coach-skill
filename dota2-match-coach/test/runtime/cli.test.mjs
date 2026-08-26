import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from '../../scripts/analyze-match.mjs';
import { fileURLToPath } from 'node:url';
import { runAnalysis } from '../../scripts/analyze-match.mjs';
import * as cli from '../../scripts/analyze-match.mjs';
import { NormalizationError } from '../../scripts/lib/normalize.mjs';

const runtimeDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptsDirectory = path.resolve(runtimeDirectory, '../../scripts');

function processResult(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: path.resolve(runtimeDirectory, '../../..'), windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('parses required positive integer IDs and timeout options', () => {
  assert.deepEqual(parseArgs(['--match-id', '8963363814', '--account-id', '56386500']), {
    matchId: 8963363814,
    accountId: 56386500,
    heroName: null,
    outputDir: null,
    parseTimeoutMs: 120000,
  });
  assert.deepEqual(parseArgs(['--match-id', '1', '--account-id', '2', '--output-dir', 'artifacts', '--parse-timeout-ms', '4000']), {
    matchId: 1,
    accountId: 2,
    heroName: null,
    outputDir: 'artifacts',
    parseTimeoutMs: 4000,
  });
});

test('accepts a hero name instead of account ID and preserves an optional selector cross-check', () => {
  assert.deepEqual(parseArgs(['--match-id', '8963363814', '--hero', 'Earth Spirit']), {
    matchId: 8963363814,
    accountId: null,
    heroName: 'Earth Spirit',
    outputDir: null,
    parseTimeoutMs: 120000,
  });
  assert.deepEqual(parseArgs(['--match-id', '1', '--account-id', '2', '--hero', 'Earth Spirit']), {
    matchId: 1,
    accountId: 2,
    heroName: 'Earth Spirit',
    outputDir: null,
    parseTimeoutMs: 120000,
  });
});

test('rejects missing, duplicate, fractional, zero, and unknown CLI arguments', () => {
  for (const argv of [
    ['--match-id', '1'],
    ['--match-id', '1', '--hero', ''],
    ['--match-id', '1', '--hero', '   '],
    ['--match-id', '1', '--account-id', '2', '--account-id', '3'],
    ['--match-id', '1', '--account-id', '2', '--parse-timeout-ms', '3', '--parse-timeout-ms', '4'],
    ['--match-id', '1.5', '--account-id', '2'],
    ['--match-id', '0', '--account-id', '2'],
    ['--match-id', '1', '--account-id', '2', '--parse-timeout-ms', '0'],
    ['--match-id', '1', '--account-id', '2', '--unknown'],
  ]) {
    assert.throws(() => parseArgs(argv), /invalid|missing|duplicate|unknown/i);
  }
});

test('resolves account ID from an unambiguous hero name before normalization', async () => {
  const calls = [];
  const result = await runAnalysis({ matchId: 1, accountId: null, heroName: 'Earth Spirit' }, {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 123, duration: 1, players: [{ account_id: 55, hero_id: 107 }] } }),
      loadHeroConstants: async () => {
        calls.push('heroes');
        return { status: 'ready', heroes: { 107: { id: 107, name: 'npc_dota_hero_earth_spirit', localized_name: 'Earth Spirit' } } };
      },
    },
    valveClient: { resolvePatch: async () => readyValve() },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    normalize: (input) => {
      calls.push(['normalize', input.accountId]);
      return { request: { matchId: 1, accountId: input.accountId }, sources: {}, dataQuality: { mode: 'degraded' } };
    },
    write: async () => ({ jsonPath: '1.json', markdownPath: '1.md' }),
  });

  assert.deepEqual(calls, ['heroes', ['normalize', 55]]);
  assert.equal(result.model.request.accountId, 55);
});

test('rejects an account ID that conflicts with the requested hero', async () => {
  await assert.rejects(() => runAnalysis({ matchId: 1, accountId: 2, heroName: 'Earth Spirit' }, {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 123, duration: 1, players: [{ account_id: 2, hero_id: 1 }, { account_id: 55, hero_id: 107 }] } }),
      loadHeroConstants: async () => ({ status: 'ready', heroes: { 107: { id: 107, localized_name: 'Earth Spirit' } } }),
    },
    valveClient: { resolvePatch: async () => readyValve() },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    normalize: () => ({ request: {}, sources: {}, dataQuality: {} }),
    write: async () => ({ jsonPath: '1.json', markdownPath: '1.md' }),
  }), (error) => error?.code === 'selector_conflict');
});

test('rejects an ambiguous duplicated hero selector', async () => {
  await assert.rejects(() => runAnalysis({ matchId: 1, accountId: null, heroName: 'Earth Spirit' }, {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 123, duration: 1, players: [{ account_id: 55, hero_id: 107 }, { account_id: 56, hero_id: 107 }] } }),
      loadHeroConstants: async () => ({ status: 'ready', heroes: { 107: { id: 107, localized_name: 'Earth Spirit' } } }),
    },
    valveClient: { resolvePatch: async () => readyValve() },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    normalize: () => ({ request: {}, sources: {}, dataQuality: {} }),
    write: async () => ({ jsonPath: '1.json', markdownPath: '1.md' }),
  }), (error) => error?.code === 'hero_ambiguous');
});

test('orchestrates OpenDota before patch and STRATZ then writes normalized artifacts', async () => {
  const calls = [];
  const writes = [];
  const result = await runAnalysis({ matchId: 1, accountId: 2, outputDir: 'out', parseTimeoutMs: 77 }, {
    openDotaClient: { loadMatch: async (matchId, options) => {
      calls.push(['opendota', matchId, options.parseTimeoutMs]);
      return { status: 'ready', match: { start_time: 123, duration: 1, players: [{ account_id: 2 }] }, parse: { state: 'completed' } };
    } },
    valveClient: { resolvePatch: async (startTime) => {
      calls.push(['valve', startTime]);
      return { status: 'ready', matchPatch: '7.41e', currentPatch: '7.41e', isCurrentExactPatch: true };
    } },
    stratzClient: { loadMatch: async (matchId) => {
      calls.push(['stratz', matchId]);
      return { status: 'unavailable', reason: 'missing_token' };
    } },
    normalize: (input) => ({ request: { matchId: input.matchId, accountId: input.accountId }, sources: { opendota: { status: input.openDota.status }, stratz: { status: input.stratz.status }, valve: { status: input.valve.status } }, dataQuality: { mode: 'degraded' } }),
    write: async (model, outputDir) => { writes.push([model, outputDir]); return { jsonPath: '1.json', markdownPath: '1.md' }; },
  });

  assert.deepEqual(calls, [['opendota', 1, 77], ['valve', 123], ['stratz', 1]]);
  assert.equal(result.artifacts.jsonPath, '1.json');
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1], 'out');
});

test('uses the skill-root output directory when no output directory is supplied', async () => {
  let receivedOutputDir;
  await runAnalysis({ matchId: 1, accountId: 2, parseTimeoutMs: 1 }, {
    openDotaClient: { loadMatch: async () => ({ status: 'ready', match: { start_time: 1, duration: 1, players: [{ account_id: 2 }] }, parse: { state: 'completed' } }) },
    valveClient: { resolvePatch: async () => readyValve() },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    normalize: () => ({ request: { matchId: 1, accountId: 2 }, dataQuality: { mode: 'degraded' } }),
    write: async (_model, outputDir) => { receivedOutputDir = outputDir; return { jsonPath: '1.json', markdownPath: '1.md' }; },
  });

  assert.equal(receivedOutputDir, path.resolve(scriptsDirectory, '../output'));
});

test('writes scoreboard evidence when replay parsing failed and STRATZ has no token on the current exact patch', async () => {
  const writes = [];
  const openDota = {
    status: 'ready',
    match: { start_time: 123, duration: 120, players: [{ account_id: 2, hero_id: 107, kills: 4 }] },
    parse: { requested: true, state: 'failed' },
    error: { code: 'parse_failed' },
  };
  const result = await runAnalysis({ matchId: 1, accountId: 2 }, {
    openDotaClient: { loadMatch: async () => openDota },
    valveClient: { resolvePatch: async () => readyValve() },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    normalize: (input) => ({ request: { matchId: 1, accountId: 2 }, sources: { opendota: { status: input.openDota.status, parse: input.openDota.parse }, stratz: { status: input.stratz.status }, valve: { status: input.valve.status } }, dataQuality: { mode: 'degraded' } }),
    write: async (model) => { writes.push(model); return { jsonPath: '1.json', markdownPath: '1.md' }; },
  });

  assert.equal(result.artifacts.jsonPath, '1.json');
  assert.equal(writes[0].sources.opendota.parse.state, 'failed');
});

test('uses a single ready STRATZ response to verify patch and write when OpenDota failed', async () => {
  const calls = [];
  let writes = 0;
  const result = await runAnalysis({ matchId: 1, accountId: 2 }, {
    openDotaClient: { loadMatch: async () => { calls.push('opendota'); return { status: 'failed', error: { code: 'network' } }; } },
    stratzClient: { loadMatch: async () => { calls.push('stratz'); return { status: 'ready', match: { startDateTime: 1785400000, durationSeconds: 120, players: [{ steamAccountId: 2 }] } }; } },
    valveClient: { resolvePatch: async (startTime) => { calls.push(['valve', startTime]); return readyValve(); } },
    normalize: (input) => ({ request: { matchId: 1, accountId: 2 }, sources: { opendota: { status: input.openDota.status }, stratz: { status: input.stratz.status }, valve: { status: input.valve.status } }, dataQuality: { mode: 'degraded' } }),
    write: async () => { writes += 1; return { jsonPath: '1.json', markdownPath: '1.md' }; },
  });

  assert.deepEqual(calls, ['opendota', 'stratz', ['valve', 1785400000]]);
  assert.equal(writes, 1);
  assert.equal(result.artifacts.jsonPath, '1.json');
});

for (const startDateTime of [undefined, 'not-a-date']) {
  test(`returns patch_unverified without writing for STRATZ-only timestamp ${String(startDateTime)}`, async () => {
    let valveCalls = 0;
    let writes = 0;
    await assert.rejects(() => runAnalysis({ matchId: 1, accountId: 2 }, {
      openDotaClient: { loadMatch: async () => ({ status: 'failed', error: { code: 'network' } }) },
      stratzClient: { loadMatch: async () => ({ status: 'ready', match: { startDateTime, players: [{ steamAccountId: 2 }] } }) },
      valveClient: { resolvePatch: async () => { valveCalls += 1; return readyValve(); } },
      normalize: () => { throw new Error('normalize should not run'); },
      write: async () => { writes += 1; },
    }), (error) => error?.code === 'patch_unverified');

    assert.equal(valveCalls, 0);
    assert.equal(writes, 0);
  });
}

for (const [name, valve, code] of [
  ['older exact patch', { status: 'ready', matchPatch: '7.41d', currentPatch: '7.41e', isCurrentExactPatch: false }, 'unsupported_patch'],
  ['unverified Valve timeline', { status: 'failed', error: { code: 'network' } }, 'patch_unverified'],
]) {
  test(`does not persist a success artifact for ${name}`, async () => {
    let writes = 0;
    await assert.rejects(() => runAnalysis({ matchId: 1, accountId: 2 }, {
      openDotaClient: { loadMatch: async () => readyOpenDota() },
      valveClient: { resolvePatch: async () => valve },
      stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
      normalize: () => { throw new Error('normalize should not run'); },
      write: async () => { writes += 1; },
    }), (error) => error?.code === code);
    assert.equal(writes, 0);
  });
}

test('classifies OpenDota match-not-found before contacting other sources', async () => {
  const calls = [];
  await assert.rejects(() => runAnalysis({ matchId: 1, accountId: 2 }, {
    openDotaClient: { loadMatch: async () => { calls.push('opendota'); return { status: 'not_found' }; } },
    valveClient: { resolvePatch: async () => { calls.push('valve'); } },
    stratzClient: { loadMatch: async () => { calls.push('stratz'); } },
    normalize: () => { calls.push('normalize'); },
    write: async () => { calls.push('write'); },
  }), (error) => error?.code === 'match_not_found');
  assert.deepEqual(calls, ['opendota']);
});

test('classifies unusable source data without normalizing or writing', async () => {
  const calls = [];
  await assert.rejects(() => runAnalysis({ matchId: 1, accountId: 2 }, {
    openDotaClient: { loadMatch: async () => ({ status: 'failed', error: { code: 'network' } }) },
    valveClient: { resolvePatch: async () => { calls.push('valve'); return { status: 'failed', error: { code: 'network' } }; } },
    stratzClient: { loadMatch: async () => { calls.push('stratz'); return { status: 'failed', error: { code: 'network' } }; } },
    normalize: () => { calls.push('normalize'); },
    write: async () => { calls.push('write'); },
  }), (error) => error?.code === 'no_usable_source_data');
  assert.deepEqual(calls, ['stratz']);
});

test('PowerShell wrapper returns exit 2 for an invalid numeric ID without network access', async (context) => {
  if (process.platform !== 'win32') return context.skip('The PowerShell wrapper is executed on Windows hosts only.');

  const result = await processResult('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(scriptsDirectory, 'analyze-match.ps1'), '-MatchId', '0', '-AccountId', '2',
  ]);

  assert.equal(result.code, 2);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /STRATZ_API_KEY|Bearer|Authorization/i);
});

test('POSIX wrapper returns exit 2 for an invalid numeric ID without network access', async (context) => {
  if (process.platform === 'win32') return context.skip('The POSIX wrapper is executed on macOS and Linux hosts only.');

  const result = await processResult('/bin/sh', [path.join(scriptsDirectory, 'analyze-match.sh'), '0', '2']);

  assert.equal(result.code, 2);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /STRATZ_API_KEY|Bearer|Authorization/i);
});

test('POSIX wrapper remains portable and quotes positional arguments', async () => {
  const wrapper = await readFile(path.join(scriptsDirectory, 'analyze-match.sh'), 'utf8');

  assert.match(wrapper, /^#!\/bin\/sh/m);
  assert.match(wrapper, /^set -eu$/m);
  assert.match(wrapper, /SCRIPT_DIR=\$\(CDPATH= cd -- "\$\(dirname -- "\$0"\)" && pwd\)/);
  assert.match(wrapper, /MATCH_ID=\$1/);
  assert.match(wrapper, /PLAYER_SELECTOR=\$2/);
  assert.match(wrapper, /--match-id "\$MATCH_ID" --account-id "\$PLAYER_SELECTOR" "\$@"/);
});

test('platform wrappers accept a hero name selector when account ID is unavailable', async () => {
  const powershell = await readFile(path.join(scriptsDirectory, 'analyze-match.ps1'), 'utf8');
  const posix = await readFile(path.join(scriptsDirectory, 'analyze-match.sh'), 'utf8');

  assert.match(powershell, /\[string\]\$Hero/);
  assert.match(powershell, /--hero/);
  assert.match(posix, /--hero "\$PLAYER_SELECTOR"/);
  assert.match(posix, /--account-id "\$PLAYER_SELECTOR"/);
});

function readyOpenDota() {
  return { status: 'ready', match: { start_time: 123, duration: 1, players: [{ account_id: 2 }] }, parse: { state: 'completed' } };
}

function readyValve() {
  return { status: 'ready', matchPatch: '7.41e', currentPatch: '7.41e', isCurrentExactPatch: true };
}

function cliModel({ openDota = 'ready', stratz = 'unavailable', valve = 'ready' } = {}) {
  return {
    sources: { opendota: { status: openDota }, stratz: { status: stratz }, valve: { status: valve } },
    request: { matchId: 1, accountId: 2 },
    dataQuality: { mode: 'degraded' },
  };
}

function cliDependencies({ openDota = readyOpenDota(), stratz = { status: 'unavailable', reason: 'missing_token' }, valve = readyValve(), normalize = () => cliModel(), write = async () => ({ jsonPath: 'safe.json', markdownPath: 'safe.md' }) } = {}) {
  return {
    openDotaClient: { loadMatch: async () => openDota },
    stratzClient: { loadMatch: async () => stratz },
    valveClient: { resolvePatch: async () => valve },
    normalize,
    write,
  };
}

test('CLI boundary returns success and prints only safe statuses and artifact paths', async () => {
  const stdout = [];
  const stderr = [];

  assert.equal(typeof cli.runCli, 'function');
  const exitCode = await cli.runCli(['--match-id', '1', '--account-id', '2'], {
    dependencies: cliDependencies(), stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(stdout, ['opendota: ready', 'valve: ready', 'stratz: unavailable', 'json: safe.json', 'markdown: safe.md']);
  assert.deepEqual(stderr, []);
});

for (const [name, normalize, expectedExitCode] of [
  ['account not found', () => { throw new NormalizationError('account_not_found', 'Bearer raw-response-token'); }, 2],
  ['account ambiguity', () => { throw new NormalizationError('account_ambiguous', 'Bearer raw-response-token'); }, 2],
]) {
  test(`CLI boundary returns ${expectedExitCode} and emits no raw source data for ${name}`, async () => {
    const stdout = [];
    const stderr = [];
    const exitCode = await cli.runCli(['--match-id', '1', '--account-id', '2'], {
      dependencies: cliDependencies({ normalize }), stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line),
    });

    assert.equal(exitCode, expectedExitCode);
    assert.deepEqual(stdout, []);
    assert.deepEqual(stderr, [`error: ${name === 'account not found' ? 'account_not_found' : 'account_ambiguous'}`]);
  });
}

test('CLI boundary returns 3 and emits no raw source data for an OpenDota match miss', async () => {
  const stdout = [];
  const stderr = [];
  const exitCode = await cli.runCli(['--match-id', '1', '--account-id', '2'], {
    dependencies: cliDependencies({ openDota: { status: 'not_found', error: { code: 'http', raw: 'Bearer raw-response-token' } } }),
    stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 3);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, ['error: match_not_found']);
});

test('CLI boundary returns 4 and emits no raw source data when neither match source is usable', async () => {
  const stdout = [];
  const stderr = [];
  const exitCode = await cli.runCli(['--match-id', '1', '--account-id', '2'], {
    dependencies: cliDependencies({
      openDota: { status: 'failed', error: { code: 'network', raw: 'Bearer raw-response-token' } },
      stratz: { status: 'failed', error: { code: 'network', raw: 'Bearer raw-response-token' } },
    }),
    stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 4);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, ['error: no_usable_source_data']);
});

test('CLI boundary emits only a fixed allowlisted diagnostic for unexpected exceptions', async () => {
  const stdout = [];
  const stderr = [];
  const exitCode = await cli.runCli(['--match-id', '1', '--account-id', '2'], {
    dependencies: cliDependencies({ normalize: () => { throw new Error('Bearer secret response body query text'); } }),
    stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 4);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, ['error: runtime_error']);
  assert.doesNotMatch(stderr.join(' '), /Bearer|secret|response body|query text/i);
});

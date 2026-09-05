import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wrapperPath = fileURLToPath(new URL('../analyze-match.ps1', import.meta.url));

async function captureArgs(parameters) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dota2-coach-ps-'));
  const probePath = path.join(directory, 'probe.ps1');
  const outputPath = path.join(directory, 'args.txt');
  const source = await readFile(wrapperPath, 'utf8');
  const probe = source.replace(
    /& node \(Join-Path \$PSScriptRoot 'analyze-match\.mjs'\) @runtimeArgs(?: @RemainingArgs)?\r?\nexit \$LASTEXITCODE/,
    "$runtimeArgs | Set-Content -LiteralPath $env:DOTA2_COACH_CAPTURE -Encoding utf8\nexit 0",
  );
  assert.notEqual(probe, source, 'wrapper invocation seam was not found');
  await writeFile(probePath, probe, 'utf8');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-File', probePath, ...parameters], {
    encoding: 'utf8',
    env: { ...process.env, DOTA2_COACH_CAPTURE: outputPath },
  });
  assert.equal(result.status, 0, result.stderr);
  const args = (await readFile(outputPath, 'utf8')).trim().split(/\r?\n/);
  await rm(directory, { recursive: true, force: true });
  return args;
}

test('PowerShell wrapper maps hero options without positional rebinding', { skip: process.platform !== 'win32' }, async () => {
  assert.deepEqual(await captureArgs([
    '-MatchId', '8970339828',
    '-Hero', 'Keeper of the Light',
    '-ParseTimeoutMs', '45000',
    '-OutputDir', 'C:\\coach output',
  ]), [
    '--match-id', '8970339828',
    '--hero', 'Keeper of the Light',
    '--parse-timeout-ms', '45000',
    '--output-dir', 'C:\\coach output',
  ]);
});

test('PowerShell wrapper maps account options explicitly', { skip: process.platform !== 'win32' }, async () => {
  assert.deepEqual(await captureArgs([
    '-MatchId', '8970339828',
    '-AccountId', '123456',
  ]), [
    '--match-id', '8970339828',
    '--account-id', '123456',
    '--parse-timeout-ms', '120000',
  ]);
});

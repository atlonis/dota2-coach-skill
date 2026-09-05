import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bundleRoot = path.join(repositoryRoot, 'dota2-match-coach');

test('skill bundle has valid identity frontmatter and resolvable local documentation links', async () => {
  const skillPath = path.join(bundleRoot, 'SKILL.md');
  const skill = await readFile(skillPath, 'utf8');
  const lines = skill.split(/\r?\n/);
  const closing = lines.indexOf('---', 1);

  assert.equal(lines[0], '---');
  assert.ok(closing > 1);
  assert.ok(lines.slice(1, closing).includes('name: dota2-match-coach'));
  assert.ok(lines.slice(1, closing).some((line) => line.startsWith('description: ')));

  const targets = [...skill.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1].split('#')[0])
    .filter((target) => target && !/^[a-z]+:/i.test(target));
  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.equal(existsSync(path.resolve(bundleRoot, target)), true, target);
  }
});

test('runtime entrypoints stay inside the skill bundle while roadmap remains repository-level', () => {
  for (const relative of [
    'agents/openai.yaml',
    'references/runtime.md',
    'references/source-policy.md',
    'references/death-analysis.md',
    'references/decision-stack.md',
    'references/review-template.md',
    'scripts/analyze-match.mjs',
    'scripts/analyze-match.ps1',
    'scripts/analyze-match.sh',
  ]) {
    assert.equal(existsSync(path.join(bundleRoot, relative)), true, relative);
  }
  assert.equal(existsSync(path.join(repositoryRoot, 'ROADMAP.md')), true);
  assert.equal(existsSync(path.join(bundleRoot, 'references', 'roadmap.md')), false);
});

test('keeps the POSIX wrapper executable on POSIX hosts', async (context) => {
  if (process.platform === 'win32') return context.skip('Git executable bit is verified from the index on Windows.');
  const mode = (await stat(path.join(bundleRoot, 'scripts', 'analyze-match.sh'))).mode;
  assert.notEqual(mode & 0o111, 0);
});

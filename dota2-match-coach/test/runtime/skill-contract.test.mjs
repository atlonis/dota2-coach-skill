import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('an ordinary match-ID request routes to runtime.md and the platform wrapper as the first collection step', async () => {
  const skill = await readFile(path.join(bundleRoot, 'SKILL.md'), 'utf8');
  const process = skill.split('## Обязательный процесс')[1]?.split('\n## ')[0] ?? '';
  const firstStep = process.match(/^1\. .+$/m)?.[0] ?? '';

  assert.match(firstStep, /match.?id/i);
  assert.match(firstStep, /references\/runtime\.md/);
  assert.match(firstStep, /analyze-match\.ps1/);
  assert.match(firstStep, /analyze-match\.sh/);
  assert.doesNotMatch(firstStep, /may be available|может быть доступен/i);
});

test('publishes the renamed skill contract and a repository roadmap', async () => {
  const skill = await readFile(path.join(bundleRoot, 'SKILL.md'), 'utf8');
  const metadata = await readFile(path.join(bundleRoot, 'agents', 'openai.yaml'), 'utf8');
  const roadmapPath = path.resolve(bundleRoot, 'references', 'roadmap.md');

  assert.match(skill, /^name: dota2-match-coach$/m);
  assert.match(metadata, /\$dota2-match-coach\b/);
  assert.equal(existsSync(roadmapPath), true);
});

test('keeps the POSIX wrapper executable on POSIX hosts', async (context) => {
  if (process.platform === 'win32') return context.skip('Git executable bit is verified from the index on Windows.');
  const mode = (await stat(path.join(bundleRoot, 'scripts', 'analyze-match.sh'))).mode;
  assert.notEqual(mode & 0o111, 0);
});

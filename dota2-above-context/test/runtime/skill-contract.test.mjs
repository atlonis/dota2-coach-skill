import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

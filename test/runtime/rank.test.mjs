import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLabel } from '../../dota2-match-coach/scripts/lib/rank.mjs';

test('maps a two-digit STRATZ rank code to a medal and star label', () => {
  assert.equal(rankLabel(11), 'Herald 1');
  assert.equal(rankLabel(25), 'Guardian 5');
  assert.equal(rankLabel(42), 'Archon 2');
  assert.equal(rankLabel(73), 'Divine 3');
});

test('drops the star when the code carries none', () => {
  assert.equal(rankLabel(60), 'Ancient');
  assert.equal(rankLabel(80), 'Immortal');
});

test('returns null instead of inventing a label for an unknown code', () => {
  for (const code of [0, 9, 16, 85, 90, 99, -42, 7.5, '42', null, undefined]) {
    assert.equal(rankLabel(code), null, `code ${code}`);
  }
});

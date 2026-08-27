import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_MODES, LOBBY_TYPES, resolveVocabularyField } from '../../dota2-match-coach/scripts/lib/vocabulary.mjs';

const gameMode = (candidates) => resolveVocabularyField('Game mode', GAME_MODES, candidates);
const lobbyType = (candidates) => resolveVocabularyField('Lobby type', LOBBY_TYPES, candidates);

test('treats the numeric Valve id and the STRATZ enum of one mode as agreement, not conflict', () => {
  const { field, warnings } = gameMode({ opendota: 22, stratz: 'ALL_PICK_RANKED' });

  assert.deepEqual(field, { value: 22, label: 'All Draft', source: 'opendota' });
  assert.deepEqual(warnings, []);
});

test('resolves an unranked lobby reported as 0 and UNRANKED', () => {
  const { field, warnings } = lobbyType({ opendota: 0, stratz: 'UNRANKED' });

  assert.deepEqual(field, { value: 0, label: 'Unranked', source: 'opendota' });
  assert.deepEqual(warnings, []);
});

test('keeps a genuine mode disagreement as a conflict with both candidates', () => {
  const { field, warnings } = gameMode({ opendota: 22, stratz: 'TURBO' });

  assert.deepEqual(field, {
    value: null,
    label: null,
    source: null,
    candidates: [{ value: 22, source: 'opendota' }, { value: 'TURBO', source: 'stratz' }],
  });
  assert.deepEqual(warnings, ['Game mode conflict between opendota and stratz.']);
});

test('reports an unmapped vocabulary as not comparable instead of as a conflict', () => {
  const { field, warnings } = gameMode({ opendota: 99, stratz: 'BRAND_NEW_MODE' });

  assert.equal(field.value, null);
  assert.deepEqual(field.candidates, [{ value: 99, source: 'opendota' }, { value: 'BRAND_NEW_MODE', source: 'stratz' }]);
  assert.deepEqual(warnings, [
    'Game mode value from opendota is outside the known vocabulary.',
    'Game mode value from stratz is outside the known vocabulary.',
  ]);
});

test('keeps the mapped side and names the unmapped one when only one dialect is known', () => {
  const { field, warnings } = lobbyType({ opendota: 12, stratz: 'RANKED' });

  assert.deepEqual(field, { value: 7, label: 'Ranked', source: 'stratz' });
  assert.deepEqual(warnings, ['Lobby type value from opendota is outside the known vocabulary.']);
});

test('returns an empty field when neither source reported the value', () => {
  assert.deepEqual(gameMode({}).field, { value: null, label: null, source: null });
  assert.deepEqual(gameMode({ opendota: null, stratz: undefined }).warnings, []);
});

test('does not resolve a mode from a boolean, a float, or an unknown enum spelling', () => {
  assert.equal(gameMode({ opendota: 22.5 }).field.value, null);
  assert.equal(gameMode({ opendota: true }).field.value, null);
  assert.equal(gameMode({ stratz: 'all pick ranked' }).field.value, null);
  assert.equal(gameMode({ stratz: 'all_pick_ranked' }).field.value, 22);
});

test('pins the ranges both dialects share and stops where their numbering diverges', () => {
  assert.deepEqual(GAME_MODES.map((entry) => entry.id), Array.from({ length: 25 }, (_, index) => index));
  assert.deepEqual(LOBBY_TYPES.map((entry) => entry.id), Array.from({ length: 10 }, (_, index) => index));
  for (const table of [GAME_MODES, LOBBY_TYPES]) {
    assert.equal(new Set(table.map((entry) => entry.stratz)).size, table.length);
    for (const entry of table) assert.match(entry.stratz, /^[A-Z_]+$/);
  }
});

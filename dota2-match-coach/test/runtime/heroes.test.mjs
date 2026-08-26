import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountIdByHero } from '../../scripts/lib/heroes.mjs';

const constants = { 107: { id: 107, localized_name: 'Earth Spirit' } };

function selection(overrides = {}) {
  return {
    heroName: 'Earth Spirit',
    heroConstants: constants,
    openDota: { status: 'ready', match: { players: [] } },
    stratz: { status: 'unavailable', reason: 'missing_token' },
    ...overrides,
  };
}

test('rejects duplicate hero records even when one account ID is hidden', () => {
  assert.throws(() => resolveAccountIdByHero(selection({
    openDota: { status: 'ready', match: { players: [{ hero_id: 107, account_id: 55 }, { hero_id: 107, account_id: null }] } },
  })), (error) => error?.code === 'hero_ambiguous');
});

test('rejects duplicate hero records that repeat the same visible account', () => {
  assert.throws(() => resolveAccountIdByHero(selection({
    openDota: { status: 'ready', match: { players: [{ hero_id: 107, account_id: 55 }, { hero_id: 107, account_id: 55 }] } },
  })), (error) => error?.code === 'hero_ambiguous');
});

test('rejects a hidden account on the only matching hero record', () => {
  assert.throws(() => resolveAccountIdByHero(selection({
    openDota: { status: 'ready', match: { players: [{ hero_id: 107, account_id: null }] } },
  })), (error) => error?.code === 'hero_account_unavailable');
});

test('rejects cross-source account disagreement for the selected hero', () => {
  assert.throws(() => resolveAccountIdByHero(selection({
    openDota: { status: 'ready', match: { players: [{ hero_id: 107, account_id: 55 }] } },
    stratz: { status: 'ready', match: { players: [{ heroId: 107, steamAccountId: 56 }] } },
  })), (error) => error?.code === 'hero_ambiguous');
});

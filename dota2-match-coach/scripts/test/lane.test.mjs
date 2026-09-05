import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParticipants, resolveLaneMatchup } from '../lib/lane.mjs';
import { buildEntityCatalog } from '../lib/entities.mjs';
import { openPlayer, stratzPlayer } from './fixtures.mjs';

const catalog = buildEntityCatalog({
  heroes: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [
    index + 1,
    { id: index + 1, localized_name: 'Hero ' + (index + 1) },
  ])),
});

test('maps safe/off lanes to the same physical lane and returns only actual opponents', () => {
  const openPlayers = Array.from({ length: 10 }, (_, index) => openPlayer({
    slot: index < 5 ? index : 128 + index - 5,
    accountId: 100 + index,
    heroId: index + 1,
  }));
  const stratzPlayers = [
    stratzPlayer({ accountId: 100, heroId: 1, radiant: true, lane: 'LANE_SAFE', position: 'POSITION_5' }),
    stratzPlayer({ accountId: 105, heroId: 6, radiant: false, lane: 'LANE_OFF', position: 'POSITION_3' }),
    stratzPlayer({ accountId: 106, heroId: 7, radiant: false, lane: 'LANE_SAFE', position: 'POSITION_1' }),
  ];
  const participants = normalizeParticipants({ openPlayers, stratzPlayers, catalog });
  const lane = resolveLaneMatchup({ participants, selectedAccountId: 100 });
  assert.equal(participants.length, 10);
  assert.equal(lane.selectedLane, 'bottom');
  assert.equal(lane.status, 'ready');
  assert.deepEqual(lane.opponents.map((row) => row.accountId), [105]);
});

test('never falls back to all five enemies when lane data is missing', () => {
  const participants = normalizeParticipants({
    openPlayers: Array.from({ length: 10 }, (_, index) => openPlayer({
      slot: index < 5 ? index : 128 + index - 5,
      accountId: 200 + index,
      heroId: index + 1,
    })),
    stratzPlayers: [],
    catalog,
  });
  const lane = resolveLaneMatchup({ participants, selectedAccountId: 200 });
  assert.deepEqual(lane.opponents, []);
  assert.equal(lane.status, 'unknown');
  assert.equal(lane.reason, 'selected_lane_unknown');
});

test('rejects matching nonphysical lane labels instead of declaring a matchup ready', () => {
  const lane = resolveLaneMatchup({
    participants: [
      { accountId: 300, side: 'radiant', lane: 'unknown', sourceConflict: false },
      { accountId: 305, side: 'dire', lane: 'unknown', sourceConflict: false },
    ],
    selectedAccountId: 300,
  });
  assert.deepEqual(lane.opponents, []);
  assert.equal(lane.status, 'unknown');
  assert.equal(lane.reason, 'selected_lane_unknown');
});

test('excludes same-lane participants with unknown side from opponents', () => {
  const lane = resolveLaneMatchup({
    participants: [
      { accountId: 400, side: 'radiant', lane: 'bottom', sourceConflict: false },
      { accountId: 405, side: null, lane: 'bottom', sourceConflict: false },
    ],
    selectedAccountId: 400,
  });
  assert.deepEqual(lane.opponents, []);
  assert.equal(lane.status, 'unknown');
  assert.equal(lane.reason, 'opponents_unknown');
});

test('marks a participant position timeline available only with a valid STRATZ position row', () => {
  const participants = normalizeParticipants({
    openPlayers: [openPlayer({ slot: 0, accountId: 100, heroId: 1 })],
    stratzPlayers: [
      stratzPlayer({
        accountId: 100,
        heroId: 1,
        radiant: true,
        playbackData: { playerUpdatePositionEvents: [{ time: 100, x: 20, y: 30 }] },
      }),
      stratzPlayer({
        accountId: 101,
        heroId: 2,
        radiant: true,
        playbackData: { playerUpdatePositionEvents: [{ time: 100, x: 20 }] },
      }),
    ],
    catalog,
  });

  assert.equal(participants[0].playbackAvailable, true);
  assert.equal(participants[0].positionTimelineAvailable, true);
  assert.equal(participants[1].playbackAvailable, true);
  assert.equal(participants[1].positionTimelineAvailable, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeathAnalysis,
  buildDeathContexts,
  buildDeathPatterns,
  selectPriorityDeath,
} from '../lib/deaths.mjs';
import { playback, stratzPlayer } from './fixtures.mjs';

function context(time, timeDead, observations = {}) {
  return {
    time,
    timeDead,
    observations: {
      isolated: false,
      afterConfirmedTeleport: false,
      firstAlliedDeathInFight: false,
      tradedLocally: false,
      ownDefensiveItemUsed: false,
      contextIncomplete: false,
      ...observations,
    },
  };
}

test('groups only identical non-empty sets of confirmed true observations', () => {
  const contexts = [
    context(600, 30, { isolated: true, afterConfirmedTeleport: true }),
    context(900, 45, { isolated: true, afterConfirmedTeleport: true }),
    context(1200, 60, { isolated: true, afterConfirmedTeleport: null, contextIncomplete: true }),
    context(1500, 20),
  ];

  const patterns = buildDeathPatterns(contexts);

  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].signature, 'afterConfirmedTeleport+isolated');
  assert.deepEqual(patterns[0].times, [600, 900]);
  assert.equal(patterns[0].count, 2);
  assert.equal(patterns[0].representativeDeathTime, 900);
});

test('uses the later death when a pattern has tied maximum time dead', () => {
  const patterns = buildDeathPatterns([
    context(600, 45, { isolated: true }),
    context(900, 45, { isolated: true }),
  ]);

  assert.equal(patterns[0].representativeDeathTime, 900);
});

test('prioritizes the largest pattern before the turning window', () => {
  const contexts = [
    context(400, 70),
    context(600, 20, { isolated: true }),
    context(900, 30, { isolated: true }),
  ];

  const patterns = buildDeathPatterns(contexts);

  assert.equal(selectPriorityDeath({
    contexts,
    patterns,
    turningWindow: { start: 350, end: 450 },
  }), 900);
});

test('falls back to the turning window, then maximum time dead and later time', () => {
  const contexts = [
    context(400, 70),
    context(420, 70),
    context(900, 100),
  ];

  assert.equal(selectPriorityDeath({
    contexts,
    patterns: [],
    turningWindow: { start: 350, end: 450 },
  }), 420);
  assert.equal(selectPriorityDeath({ contexts, patterns: [] }), 900);
  assert.equal(selectPriorityDeath(), null);
});

function participant(accountId, side, heroId) {
  return {
    slot: side === 'radiant' ? accountId : accountId + 128,
    accountId,
    hero: { id: heroId, name: `Hero ${heroId}` },
    side,
    playbackAvailable: true,
  };
}

function player(accountId, side, heroId, playbackData) {
  return stratzPlayer({
    accountId,
    heroId,
    radiant: side === 'radiant',
    playbackData,
  });
}

function deathInput({
  participants,
  stratzPlayers,
  teamfights = [],
  selectedRepositions = [],
  catalog = { hero: {}, item: {}, ability: {} },
} = {}) {
  return {
    selectedAccountId: 10,
    participants,
    stratzPlayers,
    teamfights,
    selectedRepositions,
    durationSeconds: 1800,
    catalog,
  };
}

test('isolated is true only with complete living positions, no nearby allies, and two nearby enemies', () => {
  const selected = participant(10, 'radiant', 1);
  const deadAlly = participant(20, 'radiant', 2);
  const farAlly = participant(30, 'radiant', 3);
  const enemyOne = participant(40, 'dire', 4);
  const enemyTwo = participant(50, 'dire', 5);
  const result = buildDeathContexts(deathInput({
    participants: [selected, deadAlly, farAlly, enemyOne, enemyTwo],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 99, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, playback({ deaths: [{ time: 90, timeDead: 20 }] })),
      player(30, 'radiant', 3, playback({ positions: [{ time: 97, x: 50, y: 0 }] })),
      player(40, 'dire', 4, playback({ positions: [{ time: 100, x: 12, y: 0 }] })),
      player(50, 'dire', 5, playback({ positions: [{ time: 98, x: 0, y: 20 }] })),
    ],
  }));
  const death = result.contexts[0];

  assert.equal(death.observations.isolated, true);
  assert.equal(death.nearbyAllies.length, 0);
  assert.deepEqual(death.nearbyEnemies.map((row) => row.distance), [12, 20]);
  assert.deepEqual(death.nearbyEnemies.map((row) => row.positionAgeSeconds), [0, 2]);
  assert.deepEqual(death.nearbyEnemies.map((row) => row.participant.accountId), [40, 50]);
});

test('isolated is false when complete evidence places an ally in radius', () => {
  const selected = participant(10, 'radiant', 1);
  const ally = participant(20, 'radiant', 2);
  const enemyOne = participant(30, 'dire', 3);
  const enemyTwo = participant(40, 'dire', 4);
  const result = buildDeathContexts(deathInput({
    participants: [selected, ally, enemyOne, enemyTwo],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, playback({ positions: [{ time: 100, x: 5, y: 0 }] })),
      player(30, 'dire', 3, playback({ positions: [{ time: 100, x: 10, y: 0 }] })),
      player(40, 'dire', 4, playback({ positions: [{ time: 100, x: 15, y: 0 }] })),
    ],
  }));

  assert.equal(result.contexts[0].observations.isolated, false);
  assert.equal(result.contexts[0].nearbyAllies[0].participant.accountId, 20);
});

test('isolated is null when a living participant has no fresh position', () => {
  const selected = participant(10, 'radiant', 1);
  const ally = participant(20, 'radiant', 2);
  const enemyOne = participant(30, 'dire', 3);
  const enemyTwo = participant(40, 'dire', 4);
  const result = buildDeathContexts(deathInput({
    participants: [selected, ally, enemyOne, enemyTwo],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, playback()),
      player(30, 'dire', 3, playback({ positions: [{ time: 100, x: 10, y: 0 }] })),
      player(40, 'dire', 4, playback({ positions: [{ time: 100, x: 15, y: 0 }] })),
    ],
  }));
  const death = result.contexts[0];

  assert.equal(death.observations.isolated, null);
  assert.equal(death.observations.contextIncomplete, true);
  assert.ok(death.unavailable.length > 0);
});

test('confirmed teleport uses only teleport-item repositions at or before death within fifteen seconds', () => {
  const selected = participant(10, 'radiant', 1);
  const result = buildDeathContexts(deathInput({
    participants: [selected],
    stratzPlayers: [player(10, 'radiant', 1, playback({
      deaths: [{ time: 100, timeDead: 5 }, { time: 120, timeDead: 5 }],
      positions: [{ time: 100, x: 0, y: 0 }, { time: 120, x: 0, y: 0 }],
    }))],
    selectedRepositions: [
      { time: 85, cause: 'teleport_item' },
      { time: 101, cause: 'teleport_item' },
      { time: 110, cause: 'ally_warp' },
    ],
  }));

  assert.deepEqual(result.contexts.map((death) => death.recentReposition?.time), [85, 110]);
  assert.deepEqual(result.contexts.map((death) => death.observations.afterConfirmedTeleport), [true, false]);
});

test('confirmed teleport remains true when a later non-teleport reposition follows it', () => {
  const selected = participant(10, 'radiant', 1);
  const result = buildDeathContexts(deathInput({
    participants: [selected],
    stratzPlayers: [player(10, 'radiant', 1, playback({
      deaths: [{ time: 100, timeDead: 30 }],
      positions: [{ time: 100, x: 0, y: 0 }],
    }))],
    selectedRepositions: [
      { time: 90, cause: 'teleport_item' },
      { time: 98, cause: 'ally_warp' },
    ],
  }));

  assert.equal(result.contexts[0].recentReposition.time, 98);
  assert.equal(result.contexts[0].observations.afterConfirmedTeleport, true);
});

test('confirmed teleport is null when the reposition timeline is unavailable', () => {
  const selected = participant(10, 'radiant', 1);
  const result = buildDeathContexts(deathInput({
    participants: [selected],
    stratzPlayers: [player(10, 'radiant', 1, playback({
      deaths: [{ time: 100, timeDead: 30 }],
      positions: [{ time: 100, x: 0, y: 0 }],
    }))],
    selectedRepositions: null,
  }));

  assert.equal(result.contexts[0].observations.afterConfirmedTeleport, null);
});

test('first allied death is true only for the first side death in a valid teamfight', () => {
  const selected = participant(10, 'radiant', 1);
  const ally = participant(20, 'radiant', 2);
  const first = buildDeathContexts(deathInput({
    participants: [selected, ally],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, playback({ deaths: [{ time: 105, timeDead: 20 }], positions: [{ time: 100, x: 50, y: 0 }] })),
    ],
    teamfights: [{ start: 90, end: 110 }],
  }));
  const second = buildDeathContexts(deathInput({
    participants: [selected, ally],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 105, timeDead: 30 }], positions: [{ time: 105, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, playback({ deaths: [{ time: 100, timeDead: 20 }], positions: [{ time: 100, x: 50, y: 0 }] })),
    ],
    teamfights: [{ start: 90, end: 110 }],
  }));

  assert.equal(first.contexts[0].observations.firstAlliedDeathInFight, true);
  assert.equal(second.contexts[0].observations.firstAlliedDeathInFight, false);
});

test('first allied death is null without a complete allied death timeline', () => {
  const selected = participant(10, 'radiant', 1);
  const ally = participant(20, 'radiant', 2);
  const incompletePlayback = playback({ positions: [{ time: 100, x: 40, y: 0 }] });
  delete incompletePlayback.deathEvents;
  const result = buildDeathContexts(deathInput({
    participants: [selected, ally],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'radiant', 2, incompletePlayback),
    ],
    teamfights: [{ start: 90, end: 110 }],
  }));

  assert.equal(result.contexts[0].observations.firstAlliedDeathInFight, null);
});

test('first allied death is null when an earlier death has no confirmed side', () => {
  const selected = participant(10, 'radiant', 1);
  const unknownSide = { ...participant(20, 'dire', 2), side: null };
  const result = buildDeathContexts(deathInput({
    participants: [selected, unknownSide],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'dire', 2, playback({ deaths: [{ time: 95, timeDead: 20 }], positions: [{ time: 95, x: 5, y: 0 }] })),
    ],
    teamfights: [{ start: 90, end: 110 }],
  }));
  const death = result.contexts[0];

  assert.equal(death.observations.firstAlliedDeathInFight, null);
  assert.equal(death.observations.contextIncomplete, true);
  assert.ok(death.unavailable.includes('participant_side_unavailable:20'));
});

test('local trade detects an enemy death within ten seconds and radius twenty', () => {
  const selected = participant(10, 'radiant', 1);
  const enemy = participant(20, 'dire', 2);
  const result = buildDeathContexts(deathInput({
    participants: [selected, enemy],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({
        deaths: [{ time: 100, timeDead: 30 }],
        kills: [{ time: 105, target: 2, positionX: 6, positionY: 8 }],
        positions: [{ time: 100, x: 0, y: 0 }],
      })),
      player(20, 'dire', 2, playback({
        deaths: [{ time: 110, timeDead: 20, positionX: 12, positionY: 16 }],
        positions: [{ time: 100, x: 10, y: 0 }],
      })),
    ],
  }));
  const death = result.contexts[0];

  assert.equal(death.observations.tradedLocally, true);
  assert.equal(death.nearbyDeaths[0].time, 110);
  assert.equal(death.nearbyDeaths[0].participant.accountId, 20);
  assert.deepEqual(death.nearbyDeaths[0].position, { time: 110, x: 12, y: 16, ageSeconds: 0 });
  assert.equal(death.nearbyDeaths[0].distance, 20);
  assert.equal(death.nearbyKills[0].time, 105);
  assert.equal(death.nearbyKills[0].participant.accountId, 20);
  assert.equal(death.nearbyKills[0].distance, 10);
});

test('local trade is false with complete evidence outside the ten-second window', () => {
  const selected = participant(10, 'radiant', 1);
  const enemy = participant(20, 'dire', 2);
  const result = buildDeathContexts(deathInput({
    participants: [selected, enemy],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'dire', 2, playback({
        deaths: [{ time: 111, timeDead: 20, positionX: 5, positionY: 0 }],
        positions: [{ time: 100, x: 10, y: 0 }],
      })),
    ],
  }));

  assert.equal(result.contexts[0].observations.tradedLocally, false);
});

test('local trade is null when an enemy death in the window has no known position', () => {
  const selected = participant(10, 'radiant', 1);
  const enemy = participant(20, 'dire', 2);
  const result = buildDeathContexts(deathInput({
    participants: [selected, enemy],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'dire', 2, playback({ deaths: [{ time: 105, timeDead: 20 }], positions: [{ time: 100, x: 10, y: 0 }] })),
    ],
  }));

  assert.equal(result.contexts[0].observations.tradedLocally, null);
  assert.equal(result.contexts[0].observations.contextIncomplete, true);
});

test('local trade is null when the nearby death has no confirmed enemy side', () => {
  const selected = participant(10, 'radiant', 1);
  const unknownSide = { ...participant(20, 'dire', 2), side: null };
  const result = buildDeathContexts(deathInput({
    participants: [selected, unknownSide],
    stratzPlayers: [
      player(10, 'radiant', 1, playback({ deaths: [{ time: 100, timeDead: 30 }], positions: [{ time: 100, x: 0, y: 0 }] })),
      player(20, 'dire', 2, playback({ deaths: [{ time: 105, timeDead: 20, positionX: 5, positionY: 0 }] })),
    ],
  }));

  assert.equal(result.contexts[0].observations.tradedLocally, null);
  assert.equal(result.contexts[0].observations.contextIncomplete, true);
});

test('defensive item use accepts an exact allowlisted name only in the preceding five seconds', () => {
  const selected = participant(10, 'radiant', 1);
  const catalog = { hero: {}, ability: {}, item: { 1: 'Force Staff', 2: 'Blink Dagger' } };
  const build = (items) => buildDeathContexts(deathInput({
    participants: [selected],
    stratzPlayers: [player(10, 'radiant', 1, playback({
      deaths: [{ time: 100, timeDead: 30 }],
      items,
      positions: [{ time: 100, x: 0, y: 0 }],
    }))],
    catalog,
  })).contexts[0];

  assert.equal(build([{ time: 95, itemId: 1 }]).observations.ownDefensiveItemUsed, true);
  assert.equal(build([{ time: 94, itemId: 1 }, { time: 99, itemId: 2 }]).observations.ownDefensiveItemUsed, false);
});

test('defensive item use is null when a checked item name cannot be resolved', () => {
  const selected = participant(10, 'radiant', 1);
  const result = buildDeathContexts(deathInput({
    participants: [selected],
    stratzPlayers: [player(10, 'radiant', 1, playback({
      deaths: [{ time: 100, timeDead: 30 }],
      items: [{ time: 99, itemId: 999 }],
      positions: [{ time: 100, x: 0, y: 0 }],
    }))],
  }));

  assert.equal(result.contexts[0].observations.ownDefensiveItemUsed, null);
  assert.equal(result.contexts[0].observations.contextIncomplete, true);
});

test('death analysis aggregates contexts, patterns, and turning-window priority', () => {
  const selected = participant(10, 'radiant', 1);
  const analysis = buildDeathAnalysis({
    ...deathInput({
      participants: [selected],
      stratzPlayers: [player(10, 'radiant', 1, playback({
        deaths: [{ time: 100, timeDead: 20 }, { time: 300, timeDead: 50 }],
        positions: [{ time: 100, x: 0, y: 0 }, { time: 300, x: 0, y: 0 }],
      }))],
    }),
    turningWindow: { start: 90, end: 110 },
  });

  assert.equal(analysis.contexts.length, 2);
  assert.deepEqual(analysis.patterns, []);
  assert.equal(analysis.priorityDeathTime, 100);
});

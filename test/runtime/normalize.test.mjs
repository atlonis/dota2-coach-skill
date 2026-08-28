import test from 'node:test';
import assert from 'node:assert/strict';
import { NormalizationError, buildPhases, dataQualityFor, normalizeEvidence } from '../../dota2-match-coach/scripts/lib/normalize.mjs';

const accountId = 56386500;
const generatedAt = '2026-08-25T00:00:00.000Z';

function openDotaPlayer(extra = {}) {
  return {
    account_id: accountId, hero_id: 107, player_slot: 3,
    gold_t: [0, 100, 250], xp_t: [0, 120, 300], lh_t: [0, 1, 3],
    dn_t: [0, 0, 1], hero_damage_t: [0, 50, 170],
    kills: 4, deaths: 2, assists: 6, last_hits: 3, denies: 1,
    gold_per_min: 125, xp_per_min: 150, total_gold: 250, net_worth: 210,
    hero_damage: 170, tower_damage: 40, hero_healing: 5,
    item_0: 50, item_1: 60, item_2: 70, item_3: 80, item_4: 90, item_5: 100,
    purchase_log: [{ time: 80, key: 'boots' }], ...extra,
  };
}

function normalize({ player = openDotaPlayer(), match = {}, stratz = { status: 'unavailable', reason: 'missing_token' }, valve, baseline } = {}) {
  return normalizeEvidence({
    matchId: 1, accountId, generatedAt, baseline,
    openDota: { status: 'ready', match: { duration: 120, radiant_win: true, players: [player], ...match }, parse: { state: 'completed' } },
    stratz, valve,
  });
}

test('finds account and keeps canonical player values attached to their source', () => {
  const model = normalize();

  assert.deepEqual(model.player.heroId, { value: 107, source: 'opendota' });
  assert.deepEqual(model.player.kills, { value: 4, source: 'opendota' });
  assert.equal(model.request.matchId, 1);
  assert.equal(model.generatedAt, generatedAt);
});

test('builds the pinned canonical evidence schema with provenance', () => {
  const model = normalize({
    match: { start_time: 1785400000, lobby_type: 7, game_mode: 22 },
    stratz: {
      status: 'ready',
      match: {
        startDateTime: 1785400000, lobbyType: 'RANKED', gameMode: 'ALL_PICK', rank: 60,
        midLaneOutcome: 'RADIANT_VICTORY',
        players: [{
          steamAccountId: accountId, heroId: 107, isRadiant: true, position: 'POSITION_2', lane: 'MID_LANE',
          steamAccount: { seasonRank: 42 },
          kills: 4, deaths: 2, assists: 6, numLastHits: 3, numDenies: 1,
          goldPerMinute: 125, experiencePerMinute: 150, networth: 250,
          heroDamage: 170, towerDamage: 40, heroHealing: 5, imp: 12,
          item0Id: 50, item1Id: 60, item2Id: 70, item3Id: 80, item4Id: 90, item5Id: 100,
          playbackData: {
            deathEvents: [{ time: 100, attacker: 8, positionX: 10, positionY: 20, timeDead: 12 }],
            runeEvents: [{ time: 101, rune: 'HASTE', action: 'PICKUP', positionX: 11, positionY: 21 }],
            abilityUsedEvents: [{ time: 30, abilityId: 500 }],
            itemUsedEvents: [{ time: 40, itemId: 50 }],
            playerUpdatePositionEvents: [{ time: 99, x: 9, y: 19 }],
            killEvents: [{ time: 110, target: 9, isGank: true }],
            assistEvents: [{ time: 111, target: 10 }],
            csEvents: [{ time: 20, npcId: 1, gold: 40, xp: 50, isCreep: true }],
            purchaseEvents: [{ time: 80, itemId: 50 }],
          },
        }],
      },
    },
  });

  assert.equal(model.schemaVersion, '1.2.0');
  assert.deepEqual(model.match.startTime, { value: 1785400000, source: 'opendota' });
  assert.deepEqual(model.match.lobbyType, { value: 7, label: 'Ranked', source: 'opendota' });
  assert.deepEqual(model.match.gameMode, {
    value: null,
    label: null,
    source: null,
    candidates: [{ value: 22, source: 'opendota' }, { value: 'ALL_PICK', source: 'stratz' }],
  });
  assert.deepEqual(model.player.side, { value: 'radiant', source: 'opendota' });
  assert.deepEqual(model.player.rank, { value: 42, label: 'Archon 2', source: 'stratz' });
  assert.deepEqual(model.match.averageRank, { value: 60, label: 'Ancient', source: 'stratz' });
  assert.deepEqual(model.lane.outcome, { value: 'RADIANT_VICTORY', source: 'stratz' });
  assert.deepEqual(model.summary.kda, { kills: 4, deaths: 2, assists: 6, source: 'opendota' });
  assert.deepEqual(model.summary.denies, { value: 1, source: 'opendota' });
  assert.deepEqual(model.items.finalInventory.map((item) => item.value), [50, 60, 70, 80, 90, 100]);
  assert.deepEqual(model.items.purchases[0], { time: 80, item: 'boots', source: 'opendota' });
  assert.deepEqual(model.series.denies, { values: [0, 0, 1], source: 'opendota' });
  assert.deepEqual(model.events.deaths[0], { time: 100, attacker: 8, positionX: 10, positionY: 20, timeDead: 12, source: 'stratz' });
  assert.deepEqual(model.events.teamfights, []);
});

test('keeps the rank label null when no source reports a medal or the code is unknown', () => {
  const withoutRank = normalize({ match: { start_time: 1785400000 } });
  assert.deepEqual(withoutRank.player.rank, { value: null, label: null, source: null });
  assert.deepEqual(withoutRank.match.averageRank, { value: null, label: null, source: null });

  const unknownCode = normalize({
    player: openDotaPlayer({ rank_tier: 99 }),
    match: { start_time: 1785400000 },
    stratz: { status: 'ready', match: { rank: 99, players: [{ steamAccountId: accountId, heroId: 107, isRadiant: true }] } },
  });
  assert.deepEqual(unknownCode.player.rank, { value: 99, label: null, source: 'opendota' });
  assert.deepEqual(unknownCode.match.averageRank, { value: 99, label: null, source: 'stratz' });
});

test('reads the player medal from the account, not from the match bracket', () => {
  const model = normalize({
    player: openDotaPlayer({ rank_tier: 42 }),
    stratz: {
      status: 'ready',
      match: { rank: 60, players: [{ steamAccountId: accountId, heroId: 107, steamAccount: { seasonRank: 42 } }] },
    },
  });

  assert.deepEqual(model.player.rank, { value: 42, label: 'Archon 2', source: 'opendota' });
  assert.deepEqual(model.match.averageRank, { value: 60, label: 'Ancient', source: 'stratz' });
});

test('leaves the medal unknown when the two account snapshots disagree', () => {
  const model = normalize({
    player: openDotaPlayer({ rank_tier: 42 }),
    stratz: {
      status: 'ready',
      match: { rank: 60, players: [{ steamAccountId: accountId, heroId: 107, steamAccount: { seasonRank: 51 } }] },
    },
  });

  assert.equal(model.player.rank.value, null);
  assert.equal(model.player.rank.label, null);
  assert.deepEqual(model.player.rank.candidates, [{ value: 42, source: 'opendota' }, { value: 51, source: 'stratz' }]);
  assert.equal(model.warnings.includes('Player rank conflict between opendota and stratz.'), true);
});

test('records which rank code selected the baseline bracket', () => {
  const byMedal = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    baseline: { ...readyBaseline([baselinePoint(10, 90_000)]), rankCode: 42, bracketSource: 'player_medal' },
  });
  assert.equal(byMedal.baseline.sameHeroPositionRankPatch.bracketSource, 'player_medal');
  assert.equal(byMedal.baseline.sameHeroPositionRankPatch.rankCode, 42);

  const byAverage = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    baseline: { ...readyBaseline([baselinePoint(10, 90_000)]), rankCode: 60, bracketSource: 'match_average' },
  });
  assert.equal(byAverage.baseline.sameHeroPositionRankPatch.bracketSource, 'match_average');
  assert.equal(byAverage.baseline.sameHeroPositionRankPatch.rankCode, 60);
});

test('preserves material cross-source summary disagreements', () => {
  const model = normalize({
    stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107, kills: 9 }] } },
  });

  assert.equal(model.summary.kills.value, null);
  assert.deepEqual(model.summary.kills.candidates, [
    { value: 4, source: 'opendota' },
    { value: 9, source: 'stratz' },
  ]);
  assert.match(model.dataQuality.warnings.join(' '), /kills conflict/i);
});

test('computes cumulative-series deltas and per-minute metrics for actual phase minutes', () => {
  const model = normalize();
  const lane = model.phases[0];

  assert.equal(lane.interval, '0–2');
  assert.equal(lane.metrics.gold, 250);
  assert.equal(lane.metrics.xp, 300);
  assert.equal(lane.metrics.lh, 3);
  assert.equal(lane.metrics.denies, 1);
  assert.equal(lane.metrics.heroDamage, 170);
  assert.equal(lane.metrics.goldPerMin, 125);
  assert.equal(lane.metrics.lhPerMin, 1.5);
  assert.equal(lane.metrics.heroDamagePerMin, 85);
});

test('uses four fixed half-open phase intervals and limits a short match to its duration', () => {
  const phases = buildPhases(openDotaPlayer(), undefined, 540);

  assert.deepEqual(phases.map(({ id, interval, start, end }) => ({ id, interval, start, end })), [
    { id: 'lane', interval: '0–9', start: 0, end: 540 },
  ]);
});

test('formats a non-minute closing phase endpoint with minute and second precision', () => {
  const phases = buildPhases(openDotaPlayer(), undefined, 1937);

  assert.equal(phases.at(-1).interval, '25–32:17');
});

test('does not fabricate a final-minute value when a cumulative series is short', () => {
  const phases = buildPhases(openDotaPlayer({ gold_t: [0, 100], xp_t: [], lh_t: [] }), undefined, 120);

  assert.equal(phases[0].metrics.gold, 100);
  assert.equal(phases[0].metrics.goldPerMin, 50);
  assert.equal(phases[0].metrics.xp, null);
  assert.equal(phases[0].metrics.lhPerMin, null);
});

test('omits later phases when a cumulative series expired before they began', () => {
  const phases = buildPhases(openDotaPlayer({ gold_t: [0, 100, 250], xp_t: [], lh_t: [], dn_t: [], hero_damage_t: [] }), undefined, 960);

  assert.equal(phases[0].metrics.goldPerMin, 25);
  assert.equal(phases[1].metrics.gold, null);
  assert.equal(phases[1].metrics.goldPerMin, null);
  assert.equal(phases[2].metrics.gold, null);
  assert.deepEqual(phases.map((phase) => phase.extremaWithinMatch), [
    ['goldPerMin:max', 'goldPerMin:min'], [], [],
  ]);
});

test('counts only STRATZ events in each half-open phase interval', () => {
  const phases = buildPhases(openDotaPlayer(), {
    playbackData: {
      killEvents: [{ time: 599 }, { time: 600 }, { time: 900 }],
      deathEvents: [{ time: 100 }, { time: 600 }],
      assistEvents: [{ time: 600 }, { time: 899 }],
    },
  }, 960);

  assert.deepEqual(phases.map((phase) => [phase.id, phase.metrics.kills, phase.metrics.deaths, phase.metrics.assists]), [
    ['lane', 1, 1, 0],
    ['transition', 1, 1, 2],
    ['midgame', 1, 0, 0],
  ]);
});

test('recognizes timed OpenDota teamfights when STRATZ fight events are absent', () => {
  const model = normalize({
    match: { teamfights: [{ start: 65, end: 101 }] },
  });

  assert.equal(model.eventInventory.fights, true);
  assert.equal(model.eventInventory.timedEvents, true);
  assert.deepEqual(model.events.teamfights, [{ start: 65, end: 101, source: 'opendota' }]);
});

test('does not treat empty or malformed OpenDota teamfights as timed evidence', () => {
  const empty = normalize({ match: { teamfights: [] } });
  const malformed = normalize({
    match: { teamfights: [{ start: '965', end: 1001 }, { start: 1001, end: 965 }] },
  });

  assert.equal(empty.eventInventory.fights, false);
  assert.equal(malformed.eventInventory.fights, false);
});

test('preserves conflicting positions instead of silently choosing one', () => {
  const model = normalize({
    player: openDotaPlayer({ position_est: 2 }),
    stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107, position: 'POSITION_4' }] } },
  });

  assert.deepEqual(model.player.position, {
    value: null,
    source: null,
    candidates: [
      { value: 2, source: 'opendota' },
      { value: 'POSITION_4', source: 'stratz' },
    ],
  });
  assert.match(model.dataQuality.warnings.join(' '), /position conflict/i);
});

test('treats equivalent numeric and STRATZ role positions as one corroborated position', () => {
  const model = normalize({
    player: openDotaPlayer({ position_est: 2 }),
    stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107, position: 'POSITION_2' }] } },
  });

  assert.deepEqual(model.player.position, { value: 2, source: 'opendota' });
  assert.equal(model.dataQuality.warnings.some((warning) => /position conflict/i.test(warning)), false);
});

test('keeps phase metrics null and closes aggregate gate when all series are empty', () => {
  const model = normalize({ player: openDotaPlayer({ gold_t: [], xp_t: [], lh_t: [], dn_t: [], hero_damage_t: [] }) });

  assert.deepEqual(model.phases[0].metrics, {
    gold: null, goldPerMin: null, xp: null, xpPerMin: null, lh: null, lhPerMin: null,
    denies: null, deniesPerMin: null, heroDamage: null, heroDamagePerMin: null,
    kills: null, deaths: null, assists: null,
  });
  assert.equal(model.dataQuality.gates.phase_aggregates, false);
});

test('rejects an absent account before creating an evidence model', () => {
  assert.throws(
    () => normalize({ player: openDotaPlayer({ account_id: 7 }) }),
    (error) => error instanceof NormalizationError && error.code === 'account_not_found',
  );
});

test('rejects duplicate account entries before creating an evidence model', () => {
  assert.throws(
    () => normalize({ match: { players: [openDotaPlayer(), openDotaPlayer({ hero_id: 8 })] } }),
    (error) => error instanceof NormalizationError && error.code === 'account_ambiguous',
  );
});

test('derives player result from Radiant/Dire slot and match result', () => {
  assert.equal(normalize({ match: { radiant_win: true } }).player.result.value, 'win');
  assert.equal(normalize({ player: openDotaPlayer({ player_slot: 128 }), match: { radiant_win: true } }).player.result.value, 'loss');
});

test('recognizes a ten-hero draft only when each side has five distinct heroes', () => {
  const completeDraft = Array.from({ length: 10 }, (_, heroId) => ({ isPick: true, heroId: heroId + 1, isRadiant: heroId < 5 }));
  const full = normalize({ stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107 }], pickBans: completeDraft } } });
  const duplicate = normalize({ stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107 }], pickBans: [...completeDraft.slice(0, 9), { isPick: true, heroId: 9, isRadiant: false }] } } });
  const unordered = normalize({ stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107 }], pickBans: completeDraft.map(({ isRadiant, ...pick }) => pick) } } });

  assert.equal(full.draft.complete, true);
  assert.equal(full.draft.radiant.length, 5);
  assert.equal(full.draft.dire.length, 5);
  assert.equal(full.dataQuality.gates.draft_ready, true);
  assert.equal(duplicate.draft.complete, false);
  assert.equal(duplicate.dataQuality.gates.draft_ready, false);
  assert.equal(unordered.draft.complete, false);
  assert.equal(unordered.dataQuality.gates.draft_ready, false);
});

test('uses a complete OpenDota hero set when STRATZ draft picks are partial', () => {
  const openPlayers = Array.from({ length: 10 }, (_, index) => openDotaPlayer({
    account_id: index === 0 ? accountId : index + 1,
    hero_id: index + 1,
    player_slot: index < 5 ? index : 128 + index - 5,
  }));
  const model = normalize({
    match: { players: openPlayers },
    stratz: { status: 'ready', match: {
      players: [{ steamAccountId: accountId, heroId: 1 }],
      pickBans: [{ isPick: true, heroId: 1 }, { isPick: true, heroId: 2 }],
    } },
  });

  assert.equal(model.draft.complete, true);
  assert.equal([...model.draft.radiant, ...model.draft.dire].every((pick) => pick.source === 'opendota'), true);
  assert.equal(model.dataQuality.gates.draft_ready, true);
});

test('warns when complete STRATZ and OpenDota hero sets disagree', () => {
  const openPlayers = Array.from({ length: 10 }, (_, index) => openDotaPlayer({
    account_id: index === 0 ? accountId : index + 1,
    hero_id: index + 1,
    player_slot: index < 5 ? index : 128 + index - 5,
  }));
  const model = normalize({
    match: { players: openPlayers },
    stratz: { status: 'ready', match: {
      players: [{ steamAccountId: accountId, heroId: 1 }],
      pickBans: Array.from({ length: 10 }, (_, index) => ({ isPick: true, heroId: index + 11, isRadiant: index < 5 })),
    } },
  });

  assert.equal(model.draft.complete, true);
  assert.match(model.dataQuality.warnings.join(' '), /draft conflict/i);
  assert.deepEqual(model.draft.candidates.map(({ source, radiant, dire }) => ({
    source,
    radiant: radiant.map((pick) => pick.value),
    dire: dire.map((pick) => pick.value),
  })), [
    { source: 'stratz', radiant: [11, 12, 13, 14, 15], dire: [16, 17, 18, 19, 20] },
    { source: 'opendota', radiant: [1, 2, 3, 4, 5], dire: [6, 7, 8, 9, 10] },
  ]);
});

test('preserves both final inventory candidates with provenance on conflict', () => {
  const model = normalize({
    stratz: { status: 'ready', match: { players: [{
      steamAccountId: accountId,
      heroId: 107,
      item0Id: 150, item1Id: 160, item2Id: 170, item3Id: 180, item4Id: 190, item5Id: 200,
    }] } },
  });

  assert.deepEqual(model.items.finalInventory.map((item) => item.value), [50, 60, 70, 80, 90, 100]);
  assert.deepEqual(model.items.finalInventoryCandidates.map(({ source, items }) => ({
    source,
    items: items.map((item) => item.value),
  })), [
    { source: 'opendota', items: [50, 60, 70, 80, 90, 100] },
    { source: 'stratz', items: [150, 160, 170, 180, 190, 200] },
  ]);
  assert.match(model.dataQuality.warnings.join(' '), /final inventory conflict/i);
});

test('bounds every STRATZ playback family and OpenDota teamfight to match duration inclusively', () => {
  const timed = () => [{ time: -1 }, { time: 0 }, { time: 120 }, { time: 121 }];
  const model = normalize({
    match: { teamfights: [
      { start: -1, end: 1 },
      { start: 0, end: 120 },
      { start: 119, end: 121 },
      { start: 50, end: 49 },
    ] },
    stratz: { status: 'ready', match: { players: [{
      steamAccountId: accountId,
      heroId: 107,
      playbackData: {
        killEvents: timed(), deathEvents: timed(), assistEvents: timed(), csEvents: timed(),
        purchaseEvents: timed().map((event) => ({ ...event, itemId: 50 })),
        runeEvents: timed(), abilityUsedEvents: timed(), itemUsedEvents: timed(), playerUpdatePositionEvents: timed(),
      },
    }] } },
  });

  for (const family of ['kills', 'deaths', 'assists', 'cs', 'purchases', 'runes', 'abilityUses', 'itemUses', 'positions']) {
    assert.deepEqual(model.events[family].map((event) => event.time), [0, 120], family);
  }
  assert.deepEqual(model.events.teamfights, [{ start: 0, end: 120, source: 'opendota' }]);
  assert.deepEqual(model.items.purchases.filter((purchase) => purchase.source === 'stratz').map((purchase) => purchase.time), [0, 120]);
});

test('does not open event_ready from an in-match death and an out-of-match teamfight', () => {
  const model = normalize({
    match: { teamfights: [{ start: 999, end: 1000 }] },
    stratz: { status: 'ready', match: { players: [{
      steamAccountId: accountId,
      heroId: 107,
      playbackData: { deathEvents: [{ time: 100 }] },
    }] } },
  });

  assert.deepEqual(model.events.deaths.map((event) => event.time), [100]);
  assert.deepEqual(model.events.teamfights, []);
  assert.equal(model.dataQuality.gates.event_ready, false);
});

test('opens full quality gates from scoreboard, side-separated draft, persisted timed events and exact current patch', () => {
  const draft = Array.from({ length: 10 }, (_, heroId) => ({ isPick: true, heroId: heroId + 1, isRadiant: heroId < 5 }));
  const model = normalize({
    stratz: {
      status: 'ready',
      match: {
        players: [{ steamAccountId: accountId, heroId: 107, position: 'POSITION_4', playbackData: {
          deathEvents: [{ time: 100 }], runeEvents: [{ time: 101, rune: 'BOUNTY' }],
        } }],
        pickBans: draft,
      },
    },
    valve: { status: 'ready', matchPatch: '7.40', currentPatch: '7.40', isCurrentExactPatch: true },
  });

  assert.equal(model.dataQuality.mode, 'full');
  assert.equal(model.dataQuality.gates.event_ready, true);
  assert.equal(model.dataQuality.gates.baseline_ready, false);
  assert.equal(model.dataQuality.gates.current_patch, true);
});

test('reports missing data gates without treating baseline absence as a quality downgrade', () => {
  const model = normalize({
    stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107, playbackData: { deathEvents: [{ time: 2 }], runeEvents: [{ time: 3 }] } }], pickBans: Array.from({ length: 10 }, (_, index) => ({ isPick: true, heroId: index + 1, isRadiant: index < 5 })) } },
    valve: { status: 'ready', isCurrentExactPatch: true },
  });
  const quality = dataQualityFor(model);

  assert.equal(quality.mode, 'full');
  assert.equal(quality.gates.baseline_ready, false);
  assert.equal(quality.missing.includes('baseline comparison'), true);
});

test('does not open event_ready from inventory booleans without consumable projected events', () => {
  const quality = dataQualityFor({
    player: { accountId: { value: accountId } },
    match: { durationSeconds: { value: 120 } },
    draft: { complete: true, radiant: [], dire: [] },
    patch: { isCurrentExactPatch: { value: true } },
    eventInventory: { timedEvents: true, deaths: true, positions: true },
    events: { deaths: [], positions: [] },
    phases: [],
  });

  assert.equal(quality.gates.event_ready, false);
});

test('labels extrema independently for every available metric across phases', () => {
  const player = openDotaPlayer({
    gold_t: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 620, 640, 660, 680, 700, 760, 820, 880, 940, 1000, 1060, 1120, 1180, 1240, 1300, 1360],
    xp_t: [0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700, 760, 820, 880, 940, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550],
    lh_t: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    hero_damage_t: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250],
    dn_t: [],
  });
  const phases = buildPhases(player, undefined, 1560);

  assert.deepEqual(phases.map(({ id, extremaWithinMatch }) => ({ id, extremaWithinMatch })), [
    { id: 'lane', extremaWithinMatch: ['goldPerMin:max', 'xpPerMin:max', 'lhPerMin:min', 'heroDamagePerMin:min'] },
    { id: 'transition', extremaWithinMatch: ['goldPerMin:min', 'lhPerMin:max', 'heroDamagePerMin:min'] },
    { id: 'midgame', extremaWithinMatch: ['goldPerMin:max', 'xpPerMin:min', 'lhPerMin:min', 'heroDamagePerMin:max'] },
    { id: 'closing', extremaWithinMatch: ['goldPerMin:max', 'xpPerMin:min', 'lhPerMin:min', 'heroDamagePerMin:max'] },
  ]);
});

test('retains ties for a metric while omitting labels for metrics with no values', () => {
  const phases = buildPhases(openDotaPlayer({ gold_t: [0, 100, 250], xp_t: [], lh_t: [], dn_t: [], hero_damage_t: [] }), undefined, 120);

  assert.deepEqual(phases.map((phase) => phase.extremaWithinMatch), [
    ['goldPerMin:max', 'goldPerMin:min'],
  ]);
});

function longMatchPlayer() {
  const minutes = 26;
  const ramp = (step) => Array.from({ length: minutes }, (_, minute) => minute * step);
  return openDotaPlayer({
    gold_t: ramp(400), xp_t: ramp(500), lh_t: ramp(6), dn_t: ramp(1), hero_damage_t: ramp(700),
  });
}

function readyBaseline(points) {
  return { status: 'ready', heroId: 107, position: 'POSITION_2', bracket: 'LEGEND_ANCIENT', weeks: [2953, 2954], points };
}

const baselinePoint = (minute, matchCount) => ({
  minute, matchCount, cs: 45, dn: 6, xp: 4000, heroDamage: 4400, networth: 3600, deaths: 1,
});

test('compares the player against the peer sample only at minutes both series actually reach', () => {
  const model = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    valve: { status: 'ready', currentPatch: '7.41e' },
    baseline: readyBaseline([baselinePoint(10, 90_000), baselinePoint(15, 88_000), baselinePoint(25, 80_000)]),
  });

  assert.equal(model.baseline.status, 'ready');
  assert.equal(model.dataQuality.gates.baseline_ready, true);
  assert.deepEqual(model.baseline.sameHeroPositionRankPatch.weeks, [2953, 2954]);
  assert.equal(model.baseline.sameHeroPositionRankPatch.statistic, 'mean');
  assert.equal(model.baseline.sameHeroPositionRankPatch.bracketLabel, 'Legend–Ancient');
  assert.deepEqual([...new Set(model.baseline.comparisons.map((row) => row.minute))], [10, 15, 25]);

  const lastHits = model.baseline.comparisons.find((row) => row.metric === 'lastHits' && row.minute === 10);
  assert.deepEqual(lastHits, {
    metric: 'lastHits', minute: 10, player: 60, baseline: 45, delta: 15, ratio: 1.333,
    matchCount: 90_000, crossSourceProxy: false, source: 'stratz',
  });
});

test('reads net worth from the net-worth field instead of accumulated gold', () => {
  const model = normalize({ stratz: { status: 'ready', match: { players: [] } } });

  assert.deepEqual(model.summary.netWorth, { value: 210, source: 'opendota' });
});

test('compares no baseline metric across measurements after dropping the net-worth proxy', () => {
  const model = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    baseline: readyBaseline([baselinePoint(10, 90_000)]),
  });

  assert.equal(model.baseline.comparisons.some((row) => row.metric === 'netWorth'), false);
  assert.equal(model.baseline.comparisons.length > 0, true);
  for (const row of model.baseline.comparisons) assert.equal(row.crossSourceProxy, false);
});

test('drops a baseline minute whose sample is too thin to compare against', () => {
  const model = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    baseline: readyBaseline([baselinePoint(10, 12), baselinePoint(25, 80_000)]),
  });

  assert.deepEqual([...new Set(model.baseline.comparisons.map((row) => row.minute))], [25]);
  assert.deepEqual(model.baseline.sameHeroPositionRankPatch.points.map((point) => point.minute), [25]);
});

test('keeps baseline_ready closed when no minute survives the sample floor', () => {
  const model = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    stratz: { status: 'ready', match: { rank: 60, players: [] } },
    baseline: readyBaseline([baselinePoint(10, 12)]),
  });

  assert.deepEqual(model.baseline, { status: 'unavailable', reason: 'no_comparable_point', sameHeroPositionRankPatch: null, comparisons: [] });
  assert.equal(model.dataQuality.gates.baseline_ready, false);
  assert.equal(model.dataQuality.missing.includes('baseline comparison'), true);
});

test('passes an unavailable baseline through without inventing a sample', () => {
  const model = normalize({
    player: longMatchPlayer(),
    match: { duration: 1500 },
    baseline: { status: 'unavailable', reason: 'no_full_week_in_current_patch' },
  });

  assert.deepEqual(model.baseline, {
    status: 'unavailable', reason: 'no_full_week_in_current_patch', sameHeroPositionRankPatch: null, comparisons: [],
  });
  assert.equal(model.dataQuality.gates.baseline_ready, false);
});

test('records a baseline request that was never made', () => {
  const model = normalize({ player: longMatchPlayer(), match: { duration: 1500 } });

  assert.equal(model.baseline.status, 'unavailable');
  assert.equal(model.baseline.reason, 'not_requested');
  assert.equal(model.dataQuality.gates.baseline_ready, false);
});

function withPlayback(playbackData, duration = 3000) {
  return normalize({
    match: { duration },
    stratz: { status: 'ready', match: { players: [{ steamAccountId: accountId, heroId: 107, playbackData }] } },
  });
}

test('names the ally warp behind a position jump instead of calling it the player teleport', () => {
  const model = withPlayback({
    abilityUsedEvents: [{ time: 1225, abilityId: 842 }],
    itemUsedEvents: [{ time: 1185, itemId: 46 }],
    playerUpdatePositionEvents: [{ time: 1226, x: 130, y: 102 }, { time: 1230, x: 96, y: 146 }],
  });

  assert.deepEqual(model.events.repositions, [{
    time: 1230, fromX: 130, fromY: 102, x: 96, y: 146,
    cause: 'ally_warp', causeTime: 1225, causeAbilityId: 842, source: 'stratz',
  }]);
  assert.equal(model.eventInventory.repositions, true);
});

test('attributes a jump to the teleport item and prefers the cause closest to the arrival', () => {
  const model = withPlayback({
    abilityUsedEvents: [{ time: 2300, abilityId: 842 }],
    itemUsedEvents: [{ time: 2316, itemId: 46 }],
    playerUpdatePositionEvents: [{ time: 2315, x: 60, y: 60 }, { time: 2320, x: 174, y: 144 }],
  });

  assert.deepEqual(model.events.repositions.map(({ cause, causeTime, causeItemId }) => ({ cause, causeTime, causeItemId })), [
    { cause: 'teleport_item', causeTime: 2316, causeItemId: 46 },
  ]);
});

test('leaves a jump without a matching own cast unattributed', () => {
  const model = withPlayback({
    abilityUsedEvents: [{ time: 400, abilityId: 5471 }],
    itemUsedEvents: [{ time: 400, itemId: 44 }],
    playerUpdatePositionEvents: [{ time: 800, x: 60, y: 60 }, { time: 804, x: 150, y: 150 }],
  });

  assert.deepEqual(model.events.repositions.map((move) => move.cause), ['unattributed']);
});

test('keeps walking and respawn out of the reposition list', () => {
  const model = withPlayback({
    deathEvents: [{ time: 1000, attacker: 8, timeDead: 40 }],
    playerUpdatePositionEvents: [
      { time: 100, x: 60, y: 60 }, { time: 105, x: 78, y: 74 },
      { time: 998, x: 120, y: 120 }, { time: 1045, x: 180, y: 180 },
    ],
  });

  assert.deepEqual(model.events.repositions, []);
});

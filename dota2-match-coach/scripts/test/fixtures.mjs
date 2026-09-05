export function openPlayer({
  slot,
  accountId,
  heroId,
  deaths = 0,
} = {}) {
  return {
    player_slot: slot,
    account_id: accountId,
    hero_id: heroId,
    deaths,
  };
}

export function stratzPlayer({
  accountId,
  heroId,
  radiant,
  lane,
  position,
  role = null,
  playbackData = null,
} = {}) {
  return {
    steamAccountId: accountId,
    heroId,
    isRadiant: radiant,
    lane,
    position,
    roleBasic: role,
    playbackData,
  };
}

export function playback({
  deaths = [],
  kills = [],
  abilities = [],
  items = [],
  positions = [],
} = {}) {
  return {
    deathEvents: deaths,
    killEvents: kills,
    abilityUsedEvents: abilities,
    itemUsedEvents: items,
    playerUpdatePositionEvents: positions,
  };
}

export function fullMatchFixture() {
  const heroIds = [90, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const accounts = heroIds.map((_, index) => 100 + index);
  const slots = heroIds.map((_, index) => index < 5 ? index : 128 + index - 5);
  const lanes = [
    ['LANE_SAFE', 'POSITION_5'], ['LANE_SAFE', 'POSITION_1'], ['LANE_MID', 'POSITION_2'], ['LANE_OFF', 'POSITION_3'], ['LANE_OFF', 'POSITION_4'],
    ['LANE_OFF', 'POSITION_3'], ['LANE_OFF', 'POSITION_4'], ['LANE_MID', 'POSITION_2'], ['LANE_SAFE', 'POSITION_1'], ['LANE_SAFE', 'POSITION_5'],
  ];
  const selectedPositions = [
    { time: 585, x: 20, y: 20 }, { time: 590, x: 60, y: 60 }, { time: 598, x: 60, y: 60 },
    { time: 885, x: 20, y: 20 }, { time: 890, x: 60, y: 60 }, { time: 898, x: 60, y: 60 },
    { time: 1198, x: 40, y: 40 },
  ];
  const positionsFor = (index) => {
    if (index === 0) return selectedPositions;
    if (index === 5) return [{ time: 598, x: 61, y: 60 }, { time: 898, x: 61, y: 60 }, { time: 1198, x: 90, y: 90 }];
    if (index === 6) return [{ time: 598, x: 60, y: 61 }, { time: 898, x: 60, y: 61 }, { time: 1198, x: 90, y: 91 }];
    if (index === 1) return [{ time: 598, x: 10, y: 10 }, { time: 898, x: 10, y: 10 }, { time: 1198, x: 41, y: 40 }];
    return [{ time: 598, x: 100, y: 100 }, { time: 898, x: 100, y: 100 }, { time: 1198, x: 100, y: 100 }];
  };
  const openPlayers = heroIds.map((heroId, index) => ({
    ...openPlayer({ slot: slots[index], accountId: accounts[index], heroId, deaths: index === 0 ? 3 : 0 }),
    kills: index === 0 ? 2 : 0, assists: index === 0 ? 12 : 0, position_est: Number(lanes[index][1].slice(-1)), rank_tier: 52,
    last_hits: index === 0 ? 75 : 0, denies: index === 0 ? 3 : 0, gold_per_min: index === 0 ? 350 : 0, xp_per_min: index === 0 ? 420 : 0,
    net_worth: index === 0 ? 10500 : 0, hero_damage: index === 0 ? 12500 : 0, tower_damage: index === 0 ? 900 : 0, hero_healing: index === 0 ? 4000 : 0,
    gold_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 300) : [], xp_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 400) : [],
    lh_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 5) : [], dn_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => Math.floor(minute / 4)) : [],
    hero_damage_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 200) : [],
    purchase_log: index === 0 ? [{ time: 300, key: 'force_staff', item_id: 102 }] : [], item_0: index === 0 ? 102 : 0,
  }));
  const stratzPlayers = heroIds.map((heroId, index) => stratzPlayer({
    accountId: accounts[index], heroId, radiant: index < 5, lane: lanes[index][0], position: lanes[index][1], role: index === 0 ? 'SUPPORT' : 'CORE',
    playbackData: playback({
      deaths: index === 0 ? [
        { time: 600, attacker: 6, byAbility: 6001, timeDead: 30 }, { time: 900, attacker: 7, byAbility: 6001, timeDead: 45 }, { time: 1200, attacker: 8, byAbility: 6001, timeDead: 60 },
      ] : [],
      abilities: index === 0 ? [{ time: 595, abilityId: 5478 }, { time: 895, abilityId: 5478 }] : [],
      items: index === 0 ? [{ time: 588, itemId: 46 }, { time: 598, itemId: 102 }, { time: 888, itemId: 46 }, { time: 898, itemId: 102 }] : [],
      positions: positionsFor(index),
    }),
  }));
  stratzPlayers[0] = {
    ...stratzPlayers[0], steamAccount: { seasonRank: 52 }, kills: 2, deaths: 3, assists: 12, numLastHits: 75, numDenies: 3,
    goldPerMinute: 350, experiencePerMinute: 420, networth: 10500, heroDamage: 12500, towerDamage: 900, heroHealing: 4000, item0Id: 102,
  };
  return {
    matchId: 999000111, accountId: 100,
    openDota: { status: 'ready', match: { duration: 1800, start_time: 1787875200, radiant_win: false, game_mode: 22, lobby_type: 7, players: openPlayers, teamfights: [] } },
    stratz: { status: 'ready', match: {
      durationSeconds: 1800, startDateTime: 1787875200, didRadiantWin: false, rank: 52, gameMode: 'ALL_PICK', lobbyType: 'RANKED', bottomLaneOutcome: 'DIRE_VICTORY', players: stratzPlayers,
      pickBans: heroIds.map((heroId, index) => ({ isPick: true, heroId, isRadiant: index < 5 })),
    } },
    valve: { status: 'ready', matchPatch: 'test-current-subpatch', currentPatch: 'test-current-subpatch', isCurrentExactPatch: true },
    baseline: { status: 'ready', heroId: 90, position: 'POSITION_5', bracket: 'DIVINE', weeks: [202635], points: [
      { minute: 10, matchCount: 500, cs: 45, dn: 2, xp: 3800, heroDamage: 1800, deaths: 1 },
      { minute: 15, matchCount: 500, cs: 65, dn: 3, xp: 5900, heroDamage: 3400, deaths: 1.5 },
      { minute: 25, matchCount: 500, cs: 105, dn: 4, xp: 9900, heroDamage: 8200, deaths: 2.5 },
      { minute: 30, matchCount: 500, cs: 125, dn: 5, xp: 12000, heroDamage: 11000, deaths: 3 },
    ] },
    entityConstants: {
      status: 'ready', heroes: Object.fromEntries(heroIds.map((id) => [id, { id, localized_name: id === 90 ? 'Keeper of the Light' : 'Hero ' + id }])),
      items: { force_staff: { id: 102, dname: 'Force Staff' }, town_portal_scroll: { id: 46, dname: 'Town Portal Scroll' } },
      abilityIds: { 5478: 'keeper_of_the_light_illuminate', 6001: 'fixture_enemy_spell' },
      abilities: { keeper_of_the_light_illuminate: { dname: 'Illuminate' }, fixture_enemy_spell: { dname: 'Fixture Enemy Spell' } }, missing: [],
    },
    generatedAt: '2026-08-28T00:00:00.000Z',
  };
}

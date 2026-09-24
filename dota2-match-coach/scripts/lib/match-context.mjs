import { entityRef } from './entities.mjs';
import { indexForOpenSlot, sideForOpenSlot } from './lane.mjs';
import { alignMinuteSeries, matchSampleTimes } from './series.mjs';

// Replay-derived match context that a parsed OpenDota match already carries:
// team economy, objectives, ward placements, buybacks and the skill build. Each
// section records what the source logged and stays unavailable, never empty,
// when the log itself is missing.

const SWING_WINDOW_MINUTES = 5;
const TEAM_ADVANTAGE_SERIES = [['earnedGold', 'radiant_gold_adv'], ['xp', 'radiant_xp_adv']];
const TEAM_BY_CODE = new Map([[2, 'radiant'], [3, 'dire']]);
const LANE_NAMES = new Map([['top', 'top'], ['mid', 'mid'], ['bot', 'bottom']]);
// Wards cannot be placed before the pre-game clock starts at -1:30; a placement
// logged earlier carries a parser time that cannot be placed on the match clock.
const EARLIEST_WARD_TIME = -90;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function openPlayers(match) {
  return Array.isArray(match?.players) ? match.players.filter((player) => player && typeof player === 'object') : [];
}

function oppositeSide(side) {
  return side === 'radiant' ? 'dire' : side === 'dire' ? 'radiant' : null;
}

function participantBySlot(participants, playerSlot) {
  if (!Number.isInteger(playerSlot)) return null;
  const index = indexForOpenSlot(playerSlot);
  return Number.isInteger(index) ? participants[index] ?? null : null;
}

function participantRef(participant, selectedAccountId) {
  if (!participant) return null;
  return {
    hero: { id: participant.hero?.id ?? null, name: participant.hero?.name ?? null },
    side: participant.side ?? null,
    selectedPlayer: participant.accountId != null && participant.accountId === selectedAccountId,
  };
}

// ---------------------------------------------------------------- team economy

function fromPerspective(values, sign, durationSeconds) {
  const lastMinute = finite(durationSeconds) ? Math.floor(durationSeconds / 60) : Infinity;
  return values.slice(0, lastMinute + 1).map((value) => (finite(value) ? value * sign : null));
}

// Team net worth exists only when all ten participants recorded the replay's
// per-minute net worth; a minute missing any one of them stays unknown.
function teamNetWorth(players, sign, durationSeconds) {
  const rows = players
    .map((player) => ({ side: sideForOpenSlot(player.player_slot), aligned: alignMinuteSeries(player.networth_t, player.times) }))
    .filter((row) => row.side != null);
  if (rows.length !== 10 || rows.filter((row) => row.side === 'radiant').length !== 5) return null;
  if (!rows.every((row) => row.aligned.basis === 'recorded_times' && row.aligned.values.length > 0)) return null;
  const length = Math.min(...rows.map((row) => row.aligned.values.length));
  const radiantLead = Array.from({ length }, (_, minute) => {
    let lead = 0;
    for (const row of rows) {
      const value = row.aligned.values[minute];
      if (!finite(value)) return null;
      lead += row.side === 'radiant' ? value : -value;
    }
    return lead;
  });
  return fromPerspective(radiantLead, sign, durationSeconds);
}

function extremesOf(values) {
  let maxLead = null;
  let maxDeficit = null;
  values.forEach((value, minute) => {
    if (!finite(value)) return;
    if (value > 0 && (maxLead === null || value > maxLead.value)) maxLead = { minute, value };
    if (value < 0 && (maxDeficit === null || value < maxDeficit.value)) maxDeficit = { minute, value };
  });
  return { maxLead, maxDeficit };
}

// The first minute at which the other side is ahead; a tie is not a change.
function leadChangesOf(values) {
  const changes = [];
  let leader = 0;
  values.forEach((value, minute) => {
    if (!finite(value) || value === 0) return;
    const current = Math.sign(value);
    if (leader !== 0 && current !== leader) {
      changes.push({ minute, ahead: current > 0 ? 'selected_side' : 'opponent_side' });
    }
    leader = current;
  });
  return changes;
}

function betterSwing(candidate, current) {
  if (current === null) return true;
  const magnitude = Math.abs(candidate.change) - Math.abs(current.change);
  if (magnitude !== 0) return magnitude > 0;
  const span = (candidate.endMinute - candidate.startMinute) - (current.endMinute - current.startMinute);
  return span !== 0 ? span < 0 : candidate.startMinute < current.startMinute;
}

// The largest measured change in each direction between two recorded minutes at
// most SWING_WINDOW_MINUTES apart. It locates a change; it does not explain it.
function largestSwingsOf(values) {
  let adverse = null;
  let favorable = null;
  for (let start = 0; start < values.length; start += 1) {
    if (!finite(values[start])) continue;
    for (let end = start + 1; end <= Math.min(values.length - 1, start + SWING_WINDOW_MINUTES); end += 1) {
      if (!finite(values[end])) continue;
      const swing = { startMinute: start, endMinute: end, start: values[start], end: values[end], change: values[end] - values[start] };
      if (swing.change < 0 && betterSwing(swing, adverse)) adverse = swing;
      if (swing.change > 0 && betterSwing(swing, favorable)) favorable = swing;
    }
  }
  return { adverse, favorable };
}

function phaseChange(values, phase) {
  const startMinute = phase.start / 60;
  const endMinute = Math.floor(phase.end / 60);
  const start = finite(values[startMinute]) ? values[startMinute] : null;
  const end = finite(values[endMinute]) ? values[endMinute] : null;
  return { startMinute, endMinute, start, end, change: start === null || end === null ? null : end - start };
}

export function buildTeamEconomy({ match, side, durationSeconds, phases = [] } = {}) {
  const unavailable = (reason) => ({
    status: 'unavailable', reason, source: null, perspective: null, swingWindowMinutes: SWING_WINDOW_MINUTES,
    measures: {}, phases: [], extremes: {}, leadChanges: {}, largestSwings: {},
  });
  if (side !== 'radiant' && side !== 'dire') return unavailable('side_unknown');
  const sign = side === 'radiant' ? 1 : -1;
  const players = openPlayers(match);
  const timing = matchSampleTimes(players);
  const measures = {};
  let reason = null;
  for (const [name, key] of TEAM_ADVANTAGE_SERIES) {
    const raw = match?.[key];
    if (!Array.isArray(raw) || raw.length === 0) { reason ??= 'series_unavailable'; continue; }
    if (!timing.times) { reason ??= timing.reason; continue; }
    const aligned = alignMinuteSeries(raw, timing.times);
    if (aligned.basis !== 'recorded_times') { reason ??= 'sample_times_inconsistent'; continue; }
    measures[name] = fromPerspective(aligned.values, sign, durationSeconds);
  }
  const netWorth = teamNetWorth(players, sign, durationSeconds);
  if (netWorth) measures.netWorth = netWorth;
  if (Object.keys(measures).length === 0) return unavailable(reason ?? 'series_unavailable');

  const names = Object.keys(measures);
  const perMeasure = (build) => Object.fromEntries(names.map((name) => [name, build(measures[name])]));
  return {
    status: 'ready',
    reason: null,
    source: 'opendota',
    perspective: side,
    swingWindowMinutes: SWING_WINDOW_MINUTES,
    measures: perMeasure((values) => ({ values })),
    phases: phases
      .filter((phase) => finite(phase?.start) && finite(phase?.end) && phase.end > phase.start)
      .map((phase) => ({
        id: phase.id, interval: phase.interval, start: phase.start, end: phase.end,
        ...perMeasure((values) => phaseChange(values, phase)),
      })),
    extremes: perMeasure(extremesOf),
    leadChanges: perMeasure(leadChangesOf),
    largestSwings: perMeasure(largestSwingsOf),
  };
}

// ------------------------------------------------------------------ objectives

function buildingFor(key) {
  const match = typeof key === 'string' ? /^npc_dota_(goodguys|badguys)_(.+)$/.exec(key) : null;
  if (!match) return null;
  const side = match[1] === 'goodguys' ? 'radiant' : 'dire';
  const tower = /^tower([1-4])(?:_(top|mid|bot))?$/.exec(match[2]);
  if (tower) return { side, kind: 'tower', tier: Number(tower[1]), lane: LANE_NAMES.get(tower[2]) ?? null, barracks: null };
  const barracks = /^(melee|range)_rax_(top|mid|bot)$/.exec(match[2]);
  if (barracks) return { side, kind: 'barracks', tier: null, lane: LANE_NAMES.get(barracks[2]), barracks: barracks[1] === 'melee' ? 'melee' : 'ranged' };
  if (match[2] === 'fort') return { side, kind: 'ancient', tier: null, lane: null, barracks: null };
  return null;
}

// A non-hero killer is named by its unit; its side is readable only when the
// unit name carries it (lane creeps, siege units).
function unitSide(unit) {
  if (typeof unit !== 'string') return null;
  if (unit.includes('goodguys')) return 'radiant';
  if (unit.includes('badguys')) return 'dire';
  return null;
}

function buildingKiller(objective, participants, heroIdsByUnit, selectedAccountId) {
  const bySlot = participantBySlot(participants, objective.player_slot);
  const heroId = heroIdsByUnit.get(objective.unit);
  const byHero = heroId == null ? null : participants.filter((participant) => participant?.hero?.id === heroId);
  const participant = bySlot ?? (byHero?.length === 1 ? byHero[0] : null);
  if (participant) return { kind: 'hero', ...participantRef(participant, selectedAccountId) };
  if (typeof objective.unit === 'string' && objective.unit.startsWith('npc_dota_hero_')) {
    return { kind: 'hero', hero: { id: heroId ?? null, name: null }, side: null, selectedPlayer: null };
  }
  return { kind: 'non_hero', hero: null, side: unitSide(objective.unit), selectedPlayer: false };
}

function firstBloodVictim(objective, players, participants, selectedAccountId) {
  let playerSlot = Number.isInteger(objective.victim_player_slot) ? objective.victim_player_slot : null;
  const index = Number(objective.key);
  if (playerSlot === null && Number.isInteger(index) && index >= 0 && index < players.length) {
    playerSlot = Number.isInteger(players[index]?.player_slot) ? players[index].player_slot : null;
  }
  return participantRef(participantBySlot(participants, playerSlot), selectedAccountId);
}

function normalizeObjective(objective, context) {
  const { participants, players, selectedAccountId, selectedSide, heroIdsByUnit } = context;
  const time = objective.time;
  const teamEvent = (type) => {
    const team = TEAM_BY_CODE.get(objective.team) ?? null;
    if (!team) return null;
    const participant = participantRef(participantBySlot(participants, objective.player_slot), selectedAccountId);
    return { time, type, team, bySelectedSide: selectedSide == null ? null : team === selectedSide, participant };
  };
  switch (objective.type) {
    case 'building_kill': {
      const building = buildingFor(objective.key);
      if (!building) return null;
      const killer = buildingKiller(objective, participants, heroIdsByUnit, selectedAccountId);
      return {
        time, type: 'building_destroyed', building, killer,
        denied: killer.side == null ? null : killer.side === building.side,
        ownBuilding: selectedSide == null ? null : building.side === selectedSide,
      };
    }
    case 'CHAT_MESSAGE_ROSHAN_KILL': return teamEvent('roshan_killed');
    case 'CHAT_MESSAGE_MINIBOSS_KILL': return teamEvent('tormentor_killed');
    case 'CHAT_MESSAGE_AEGIS':
    case 'CHAT_MESSAGE_AEGIS_STOLEN':
    case 'CHAT_MESSAGE_DENIED_AEGIS': {
      const participant = participantRef(participantBySlot(participants, objective.player_slot), selectedAccountId);
      if (!participant) return null;
      const type = objective.type === 'CHAT_MESSAGE_AEGIS' ? 'aegis_picked_up'
        : objective.type === 'CHAT_MESSAGE_AEGIS_STOLEN' ? 'aegis_stolen' : 'aegis_denied';
      return { time, type, participant, bySelectedSide: selectedSide == null ? null : participant.side === selectedSide };
    }
    case 'CHAT_MESSAGE_FIRSTBLOOD': {
      const killer = participantRef(participantBySlot(participants, objective.player_slot), selectedAccountId);
      const victim = firstBloodVictim(objective, players, participants, selectedAccountId);
      return killer || victim ? { time, type: 'first_blood', killer, victim } : null;
    }
    case 'CHAT_MESSAGE_COURIER_LOST': {
      const lostBy = TEAM_BY_CODE.get(objective.team) ?? null;
      if (!lostBy) return null;
      return {
        time, type: 'courier_lost', lostBy, lostBySelectedSide: selectedSide == null ? null : lostBy === selectedSide,
        killer: participantRef(participantBySlot(participants, objective.killer), selectedAccountId),
      };
    }
    default: return null;
  }
}

export function buildObjectives({ match, participants = [], selectedAccountId, selectedSide, heroConstants, durationSeconds } = {}) {
  if (!Array.isArray(match?.objectives)) {
    return { status: 'unavailable', reason: 'objectives_unavailable', source: null, events: [], unrecognizedCount: 0 };
  }
  const heroIdsByUnit = new Map(Object.values(heroConstants ?? {})
    .filter((hero) => typeof hero?.name === 'string' && Number.isSafeInteger(hero?.id))
    .map((hero) => [hero.name, hero.id]));
  const context = {
    participants, players: openPlayers(match), selectedAccountId,
    selectedSide: selectedSide === 'radiant' || selectedSide === 'dire' ? selectedSide : null, heroIdsByUnit,
  };
  const events = [];
  let unrecognizedCount = 0;
  for (const objective of match.objectives) {
    const inMatch = finite(objective?.time) && objective.time >= 0 && (!finite(durationSeconds) || objective.time <= durationSeconds);
    const event = inMatch ? normalizeObjective(objective, context) : null;
    if (event) events.push(event);
    else unrecognizedCount += 1;
  }
  events.sort((left, right) => left.time - right.time);
  return { status: 'ready', reason: null, source: 'opendota', events, unrecognizedCount };
}

// ----------------------------------------------------------------------- wards

// A ward's exit is matched by its entity handle. Handles can be reused later in a
// match, so each placement takes the first unused exit at or after its own time.
function exitTimesByHandle(entries) {
  const exits = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry?.ehandle == null || !finite(entry?.time)) continue;
    exits.set(entry.ehandle, [...(exits.get(entry.ehandle) ?? []), entry.time].sort((left, right) => left - right));
  }
  return exits;
}

function takeExit(exits, handle, placedAt) {
  const times = handle == null ? null : exits.get(handle);
  const index = times ? times.findIndex((time) => time >= placedAt) : -1;
  return index === -1 ? null : times.splice(index, 1)[0];
}

function wardPlacements(player, durationSeconds) {
  const placements = [];
  let excludedCount = 0;
  for (const [kind, placedKey, leftKey] of [['observer', 'obs_log', 'obs_left_log'], ['sentry', 'sen_log', 'sen_left_log']]) {
    const exits = exitTimesByHandle(player?.[leftKey]);
    const placed = (Array.isArray(player?.[placedKey]) ? player[placedKey] : [])
      .slice().sort((left, right) => (finite(left?.time) ? left.time : Infinity) - (finite(right?.time) ? right.time : Infinity));
    for (const entry of placed) {
      if (!finite(entry?.time) || entry.time < EARLIEST_WARD_TIME || (finite(durationSeconds) && entry.time > durationSeconds)) {
        excludedCount += 1;
        continue;
      }
      const endedAt = takeExit(exits, entry.ehandle, entry.time);
      placements.push({ time: entry.time, kind, endedAt, secondsActive: endedAt === null ? null : endedAt - entry.time });
    }
  }
  placements.sort((left, right) => left.time - right.time || left.kind.localeCompare(right.kind));
  return { placements, excludedCount };
}

function hasWardLogs(player) {
  return Array.isArray(player?.obs_log) && Array.isArray(player?.sen_log);
}

function sideCounts(players, side, durationSeconds) {
  const rows = players.filter((player) => sideForOpenSlot(player.player_slot) === side);
  if (rows.length !== 5 || !rows.every(hasWardLogs)) return null;
  const counts = { observer: 0, sentry: 0 };
  for (const row of rows) {
    for (const placement of wardPlacements(row, durationSeconds).placements) counts[placement.kind] += 1;
  }
  return counts;
}

export function buildWards({ match, selectedOpenPlayer, selectedSide, durationSeconds } = {}) {
  if (!hasWardLogs(selectedOpenPlayer)) {
    return { status: 'unavailable', reason: 'ward_logs_unavailable', source: null, selectedPlayer: null, teams: null };
  }
  const { placements, excludedCount } = wardPlacements(selectedOpenPlayer, durationSeconds);
  const players = openPlayers(match);
  const side = selectedSide === 'radiant' || selectedSide === 'dire' ? selectedSide : null;
  return {
    status: 'ready',
    reason: null,
    source: 'opendota',
    selectedPlayer: {
      placements,
      observerCount: placements.filter((placement) => placement.kind === 'observer').length,
      sentryCount: placements.filter((placement) => placement.kind === 'sentry').length,
      excludedCount,
    },
    teams: side === null ? null : {
      selectedSide: sideCounts(players, side, durationSeconds),
      opponentSide: sideCounts(players, oppositeSide(side), durationSeconds),
    },
  };
}

// -------------------------------------------------------------------- buybacks

function buybackTimes(player, durationSeconds) {
  return (Array.isArray(player?.buyback_log) ? player.buyback_log : [])
    .filter((entry) => finite(entry?.time) && entry.time >= 0 && (!finite(durationSeconds) || entry.time <= durationSeconds))
    .map((entry) => entry.time)
    .sort((left, right) => left - right);
}

function sideBuybackCount(players, side, durationSeconds) {
  const rows = players.filter((player) => sideForOpenSlot(player.player_slot) === side);
  if (rows.length !== 5 || !rows.every((player) => Array.isArray(player.buyback_log))) return null;
  return rows.reduce((sum, player) => sum + buybackTimes(player, durationSeconds).length, 0);
}

export function buildBuybacks({ match, selectedOpenPlayer, selectedSide, durationSeconds } = {}) {
  if (!Array.isArray(selectedOpenPlayer?.buyback_log)) {
    return { status: 'unavailable', reason: 'buyback_log_unavailable', source: null, selectedPlayer: [], selectedSideCount: null, opponentSideCount: null };
  }
  const players = openPlayers(match);
  const side = selectedSide === 'radiant' || selectedSide === 'dire' ? selectedSide : null;
  return {
    status: 'ready',
    reason: null,
    source: 'opendota',
    selectedPlayer: buybackTimes(selectedOpenPlayer, durationSeconds).map((time) => ({ time })),
    selectedSideCount: side === null ? null : sideBuybackCount(players, side, durationSeconds),
    opponentSideCount: side === null ? null : sideBuybackCount(players, oppositeSide(side), durationSeconds),
  };
}

// ----------------------------------------------------------------- skill build

// The recorded order of ability and talent upgrades. The order is not the hero
// level of each upgrade: some levels grant no point.
export function buildSkillBuild({ selectedOpenPlayer, catalog } = {}) {
  const upgrades = selectedOpenPlayer?.ability_upgrades_arr;
  if (!Array.isArray(upgrades) || upgrades.length === 0) {
    return { status: 'unavailable', reason: 'skill_build_unavailable', source: null, upgrades: [] };
  }
  return {
    status: 'ready',
    reason: null,
    source: 'opendota',
    upgrades: upgrades
      .filter((abilityId) => Number.isSafeInteger(abilityId) && abilityId > 0)
      .map((abilityId, index) => ({ order: index + 1, ability: entityRef(catalog, 'ability', abilityId) })),
  };
}

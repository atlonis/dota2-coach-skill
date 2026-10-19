import { entityRef } from './entities.mjs';

const SLOT_COUNT = 10;
const PHYSICAL_LANES = new Set(['top', 'mid', 'bottom']);
const PHYSICAL_SIDES = new Set(['radiant', 'dire']);

function positiveInteger(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

export function sideForOpenSlot(slot) {
  if (Number.isInteger(slot) && slot >= 0 && slot <= 4) return 'radiant';
  if (Number.isInteger(slot) && slot >= 128 && slot <= 132) return 'dire';
  return null;
}

export function indexForOpenSlot(slot) {
  if (slot >= 0 && slot <= 4) return slot;
  if (slot >= 128 && slot <= 132) return slot - 123;
  return null;
}

function sideForStratz(player) {
  return typeof player?.isRadiant === 'boolean' ? (player.isRadiant ? 'radiant' : 'dire') : null;
}

function positionFor(player) {
  const value = player?.position;
  const match = typeof value === 'string' && /^POSITION_([1-5])$/.exec(value);
  return match ? Number(match[1]) : value ?? null;
}

function hasPositionTimeline(player) {
  return Array.isArray(player?.playbackData?.playerUpdatePositionEvents)
    && player.playbackData.playerUpdatePositionEvents.some((point) =>
      Number.isFinite(point?.time) && Number.isFinite(point?.x) && Number.isFinite(point?.y));
}

function emptyParticipant(slot) {
  return {
    slot,
    accountId: null,
    hero: { id: null, name: null },
    side: slot < 5 ? 'radiant' : 'dire',
    position: null,
    lane: null,
    laneSource: null,
    isRoaming: null,
    role: null,
    rank: null,
    playbackAvailable: false,
    positionTimelineAvailable: false,
    sourceConflict: false,
  };
}

// OpenDota estimates the lane from the hero's positions in the first ten minutes
// (`getLaneFromPosData` in odota/core): 1 is the bottom lane, 2 mid, 3 top, 4 and
// 5 the Radiant and Dire jungles. `is_roaming` means the hero spent less than 45%
// of that time in its most frequent lane.
const OPEN_LANES = new Map([[1, 'bottom'], [2, 'mid'], [3, 'top'], [4, 'jungle'], [5, 'jungle']]);

export function laneForOpenPlayer(player) {
  return OPEN_LANES.get(player?.lane) ?? null;
}

function participantFromOpen(slot, player, catalog) {
  const lane = laneForOpenPlayer(player);
  const position = Number.isInteger(player?.position_est) && player.position_est >= 1 && player.position_est <= 5 ? player.position_est : null;
  return {
    ...emptyParticipant(slot),
    accountId: positiveInteger(player?.account_id),
    hero: entityRef(catalog, 'hero', player?.hero_id),
    rank: player?.rank_tier ?? null,
    position,
    lane,
    laneSource: lane == null ? null : 'opendota',
    isRoaming: typeof player?.is_roaming === 'boolean' ? player.is_roaming : null,
  };
}

// STRATZ, when present, names the position and lane; OpenDota's own estimates
// fill in only what STRATZ leaves empty.
function stratzFields(player, participant) {
  const stratzSide = sideForStratz(player);
  const heroId = positiveInteger(player?.heroId);
  const stratzLane = canonicalLane(player?.lane, participant.side);
  return {
    accountId: positiveInteger(player?.steamAccountId) ?? participant.accountId,
    position: positionFor(player) ?? participant.position,
    lane: stratzLane ?? participant.lane,
    laneSource: stratzLane != null ? 'stratz' : participant.laneSource,
    role: player?.roleBasic ?? null,
    rank: player?.steamAccount?.seasonRank ?? participant.rank,
    playbackAvailable: player?.playbackData != null,
    positionTimelineAvailable: hasPositionTimeline(player),
    sourceConflict: participant.sourceConflict
      || (stratzSide != null && stratzSide !== participant.side)
      || (heroId != null && participant.hero.id != null && heroId !== participant.hero.id),
  };
}

export function canonicalLane(rawLane, side) {
  const lane = typeof rawLane === 'string' ? rawLane.toLowerCase() : '';
  if (lane.includes('mid')) return 'mid';
  if (lane.includes('top')) return 'top';
  if (lane.includes('bottom') || lane.includes('bot')) return 'bottom';
  if (lane.includes('safe')) return side === 'radiant' ? 'bottom' : side === 'dire' ? 'top' : null;
  if (lane.includes('off')) return side === 'radiant' ? 'top' : side === 'dire' ? 'bottom' : null;
  return null;
}

export function normalizeParticipants({ openPlayers = [], stratzPlayers = [], catalog } = {}) {
  const participants = Array.from({ length: SLOT_COUNT }, (_, slot) => emptyParticipant(slot));
  const occupied = new Set();

  for (const player of Array.isArray(openPlayers) ? openPlayers : []) {
    const slot = indexForOpenSlot(player?.player_slot);
    if (slot == null || occupied.has(slot)) continue;
    participants[slot] = participantFromOpen(slot, player, catalog);
    occupied.add(slot);
  }

  for (const stratzPlayer of Array.isArray(stratzPlayers) ? stratzPlayers : []) {
    if (!stratzPlayer || typeof stratzPlayer !== 'object') continue;
    const accountId = positiveInteger(stratzPlayer.steamAccountId);
    const stratzSide = sideForStratz(stratzPlayer);
    const heroId = positiveInteger(stratzPlayer.heroId);
    const accountMatches = accountId == null ? [] : participants.filter((participant) => participant.accountId === accountId);
    let matches = accountMatches;
    if (matches.length === 0 && heroId != null && stratzSide != null) {
      matches = participants.filter((participant) => participant.hero.id === heroId && participant.side === stratzSide);
    }

    if (matches.length === 1) {
      const participant = matches[0];
      Object.assign(participant, stratzFields(stratzPlayer, participant));
      continue;
    }

    if (matches.length > 1) {
      for (const participant of matches) participant.sourceConflict = true;
      continue;
    }

    if (stratzSide == null) continue;
    const slot = participants.findIndex((participant) => participant.side === stratzSide && participant.accountId == null && participant.hero.id == null);
    if (slot === -1) continue;
    const participant = participants[slot];
    participant.accountId = accountId;
    participant.hero = entityRef(catalog, 'hero', heroId);
    Object.assign(participant, stratzFields(stratzPlayer, participant));
  }

  return participants;
}

export function selectedParticipantFor(participants = [], { selectedSlot, selectedAccountId } = {}) {
  if (Number.isInteger(selectedSlot)) return participants.find((participant) => participant?.slot === selectedSlot) ?? null;
  const accountId = positiveInteger(selectedAccountId);
  return accountId == null ? null : participants.find((participant) => participant?.accountId === accountId) ?? null;
}

export function resolveLaneMatchup({ participants = [], selectedAccountId, selectedSlot } = {}) {
  const selected = selectedParticipantFor(participants, { selectedSlot, selectedAccountId });
  if (!selected) return { selectedLane: null, opponents: [], status: 'unknown', reason: 'selected_player_missing' };
  if (selected.sourceConflict) return { selectedLane: selected.lane ?? null, opponents: [], status: 'unknown', reason: 'source_conflict' };
  if (selected.lane === 'jungle') return { selectedLane: 'jungle', opponents: [], status: 'unknown', reason: 'selected_in_jungle' };
  if (!PHYSICAL_LANES.has(selected.lane)) return { selectedLane: null, opponents: [], status: 'unknown', reason: 'selected_lane_unknown' };

  const candidates = participants.filter((participant) => participant
    && PHYSICAL_SIDES.has(participant.side)
    && participant.side !== selected.side
    && participant.lane === selected.lane);
  if (candidates.some((participant) => participant.sourceConflict)) {
    return { selectedLane: selected.lane, opponents: [], status: 'unknown', reason: 'source_conflict' };
  }
  if (candidates.length === 0) return { selectedLane: selected.lane, opponents: [], status: 'unknown', reason: 'opponents_unknown' };
  if (candidates.length > 3) return { selectedLane: selected.lane, opponents: [], status: 'unknown', reason: 'too_many_opponents' };
  const allies = participants.filter((participant) => participant
    && participant.slot !== selected.slot && participant.side === selected.side && participant.lane === selected.lane);
  return { selectedLane: selected.lane, opponents: candidates, allies, laneSource: selected.laneSource ?? null, status: 'ready', reason: null };
}

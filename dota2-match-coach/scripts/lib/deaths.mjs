import { entityRef } from './entities.mjs';

export const DEATH_WINDOW_BEFORE = 15;
export const DEATH_WINDOW_AFTER = 5;
export const POSITION_MAX_AGE = 3;
export const NEARBY_RADIUS = 20;
const LOCAL_TRADE_WINDOW = 10;
const DEFENSIVE_ITEM_WINDOW = 5;

export const DEFENSIVE_ITEM_NAMES = new Set([
  'Force Staff',
  'Hurricane Pike',
  'Glimmer Cape',
  'Ghost Scepter',
  "Eul's Scepter of Divinity",
  'Wind Waker',
  'Black King Bar',
]);

function finite(value) {
  return Number.isFinite(value);
}

function timedInWindow(events, start, end) {
  return Array.isArray(events)
    ? events.filter((event) => finite(event?.time) && event.time >= start && event.time <= end)
    : [];
}

function selectedPlayer(stratzPlayers, accountId) {
  return Array.isArray(stratzPlayers)
    ? stratzPlayers.find((player) => player?.steamAccountId === accountId) ?? null
    : null;
}

function selectedParticipant(participants, accountId) {
  return Array.isArray(participants)
    ? participants.find((participant) => participant?.accountId === accountId) ?? null
    : null;
}

function stratzPlayerForParticipant(stratzPlayers, participant) {
  if (!Array.isArray(stratzPlayers) || !participant) return null;
  if (participant.accountId != null) {
    const byAccount = stratzPlayers.filter((player) => player?.steamAccountId === participant.accountId);
    if (byAccount.length === 1) return byAccount[0];
  }
  const radiant = participant.side === 'radiant' ? true : participant.side === 'dire' ? false : null;
  const byHeroAndSide = stratzPlayers.filter((player) => player?.heroId === participant.hero?.id
    && radiant != null
    && player?.isRadiant === radiant);
  return byHeroAndSide.length === 1 ? byHeroAndSide[0] : null;
}

function participantKey(participant) {
  return participant?.accountId ?? participant?.slot ?? participant?.hero?.id ?? 'unknown';
}

function addUnavailable(unavailable, reason) {
  if (!unavailable.includes(reason)) unavailable.push(reason);
}

function validDeaths(deaths, durationSeconds) {
  if (!finite(durationSeconds) || durationSeconds < 0) return [];
  return Array.isArray(deaths)
    ? deaths.filter((death) => finite(death?.time) && death.time >= 0 && death.time <= durationSeconds)
    : [];
}

function teamfightAt(teamfights, time) {
  if (!Array.isArray(teamfights)) return { inFight: null, start: null, end: null };
  const fight = teamfights.find((candidate) => finite(candidate?.start)
    && finite(candidate?.end)
    && candidate.start <= candidate.end
    && time >= candidate.start
    && time <= candidate.end);
  return fight ? { inFight: true, start: fight.start, end: fight.end } : { inFight: false, start: null, end: null };
}

function unavailableFor({ playback, position, death, teamfights, selectedRepositions }) {
  const unavailable = [];
  if (position == null) unavailable.push('death_position_unavailable');
  if (!finite(death?.timeDead)) unavailable.push('death_time_dead_unavailable');
  if (!Array.isArray(teamfights)) unavailable.push('teamfights_unavailable');
  if (!Array.isArray(playback?.abilityUsedEvents)) unavailable.push('selected_ability_uses_unavailable');
  if (!Array.isArray(playback?.itemUsedEvents)) unavailable.push('selected_item_uses_unavailable');
  if (!Array.isArray(selectedRepositions)) unavailable.push('selected_repositions_unavailable');
  if (!Array.isArray(playback?.killEvents)) unavailable.push('selected_kills_unavailable');
  return unavailable;
}

function distanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function livingAt(playback, time) {
  if (!Array.isArray(playback?.deathEvents)) return null;
  for (const death of playback.deathEvents) {
    if (!finite(death?.time)) return null;
    if (death.time > time) continue;
    if (!finite(death.timeDead) || death.timeDead < 0) return null;
    if (death.time <= time && time < death.time + death.timeDead) return false;
  }
  return true;
}

function participantProximity({
  participants,
  stratzPlayers,
  selectedAccountId,
  selectedSide,
  position,
  time,
  unavailable,
}) {
  if (!position || !Array.isArray(participants) || selectedSide == null) {
    return { complete: false, nearbyAllies: [], nearbyEnemies: [] };
  }
  let complete = true;
  const nearbyAllies = [];
  const nearbyEnemies = [];
  for (const participant of participants) {
    if (!participant || participant.accountId === selectedAccountId) continue;
    const player = stratzPlayerForParticipant(stratzPlayers, participant);
    const alive = livingAt(player?.playbackData, time);
    if (alive == null) {
      complete = false;
      addUnavailable(unavailable, `participant_liveness_unavailable:${participantKey(participant)}`);
      continue;
    }
    if (!alive) continue;
    const participantPosition = latestPositionAt(player.playbackData.playerUpdatePositionEvents, time);
    if (!participantPosition) {
      complete = false;
      addUnavailable(unavailable, `participant_position_unavailable:${participantKey(participant)}`);
      continue;
    }
    const distance = distanceBetween(position, participantPosition);
    if (distance > NEARBY_RADIUS) continue;
    const row = {
      participant,
      position: participantPosition,
      distance,
      positionAgeSeconds: participantPosition.ageSeconds,
    };
    if (participant.side === selectedSide) nearbyAllies.push(row);
    else if (participant.side == null) {
      complete = false;
      addUnavailable(unavailable, `participant_side_unavailable:${participantKey(participant)}`);
    } else nearbyEnemies.push(row);
  }
  return { complete, nearbyAllies, nearbyEnemies };
}

function recentRepositionAt(selectedRepositions, time, catalog) {
  if (!Array.isArray(selectedRepositions)) return null;
  const move = selectedRepositions
    .filter((move) => finite(move?.time)
      && move.time <= time
      && time - move.time <= DEATH_WINDOW_BEFORE)
    .sort((left, right) => right.time - left.time)[0] ?? null;
  if (move == null) return null;
  const { causeItemId, causeAbilityId, ...facts } = move;
  return {
    ...facts,
    causeItem: entityRef(catalog, 'item', causeItemId),
    causeAbility: entityRef(catalog, 'ability', causeAbilityId),
  };
}

function ownEntityUses(events, start, end, kind, catalog) {
  const idField = kind === 'ability' ? 'abilityId' : 'itemId';
  const refField = kind === 'ability' ? 'ability' : 'item';
  return timedInWindow(events, start, end).map((event) => ({
    time: event.time,
    [refField]: entityRef(catalog, kind, event[idField]),
  }));
}

function completeDeathTimeline(playback) {
  return Array.isArray(playback?.deathEvents)
    && playback.deathEvents.every((death) => finite(death?.time));
}

function firstAlliedDeathObservation({
  participants,
  stratzPlayers,
  selectedAccountId,
  selectedSide,
  teamfight,
  time,
  unavailable,
}) {
  if (!Array.isArray(participants) || selectedSide == null) {
    addUnavailable(unavailable, 'selected_participant_unavailable');
    return null;
  }
  const participantWithoutSide = participants.find((participant) => participant?.side == null);
  if (participantWithoutSide) {
    addUnavailable(unavailable, `participant_side_unavailable:${participantKey(participantWithoutSide)}`);
    return null;
  }
  const alliedDeaths = [];
  let complete = true;
  for (const participant of participants.filter((row) => row?.side === selectedSide)) {
    const player = stratzPlayerForParticipant(stratzPlayers, participant);
    if (!completeDeathTimeline(player?.playbackData)) {
      complete = false;
      addUnavailable(unavailable, `allied_deaths_unavailable:${participantKey(participant)}`);
      continue;
    }
    for (const death of player.playbackData.deathEvents) {
      alliedDeaths.push({ time: death.time, participant });
    }
  }
  if (!complete || teamfight.inFight == null) return null;
  if (!teamfight.inFight) return false;
  const inFight = alliedDeaths
    .filter((death) => death.time >= teamfight.start && death.time <= teamfight.end)
    .sort((left, right) => left.time - right.time);
  return inFight.length > 0
    && inFight[0].time === time
    && inFight.some((death) => death.time === time && death.participant.accountId === selectedAccountId);
}

function positionForEvent(event, playback) {
  if (finite(event?.positionX) && finite(event?.positionY)) {
    return { time: event.time, x: event.positionX, y: event.positionY, ageSeconds: 0 };
  }
  return latestPositionAt(playback?.playerUpdatePositionEvents, event?.time);
}

function participantForKillTarget(participants, event, selectedSide) {
  if (!Array.isArray(participants)) return null;
  const candidates = participants.filter((participant) => participant?.side !== selectedSide
    && (participant?.hero?.id === event?.target || participant?.accountId === event?.target));
  return candidates.length === 1 ? candidates[0] : null;
}

function localEvents({
  participants,
  stratzPlayers,
  selectedAccountId,
  selectedSide,
  playback,
  position,
  time,
  unavailable,
}) {
  const nearbyDeaths = [];
  const nearbyKills = [];
  let tradeComplete = position != null && Array.isArray(participants) && selectedSide != null;
  let tradedLocally = false;

  for (const participant of Array.isArray(participants) ? participants : []) {
    if (!participant || participant.accountId === selectedAccountId) continue;
    const player = stratzPlayerForParticipant(stratzPlayers, participant);
    const deathEvents = player?.playbackData?.deathEvents;
    const isEnemy = participant.side != null && participant.side !== selectedSide;
    if (participant.side == null) {
      tradeComplete = false;
      addUnavailable(unavailable, `participant_side_unavailable:${participantKey(participant)}`);
    }
    if (isEnemy && !completeDeathTimeline(player?.playbackData)) {
      tradeComplete = false;
      addUnavailable(unavailable, `enemy_deaths_unavailable:${participantKey(participant)}`);
      continue;
    }
    for (const event of Array.isArray(deathEvents) ? deathEvents : []) {
      if (Math.abs(event.time - time) > LOCAL_TRADE_WINDOW) continue;
      const eventPosition = positionForEvent(event, player.playbackData);
      if (!eventPosition || !position) {
        if (isEnemy) tradeComplete = false;
        addUnavailable(unavailable, `nearby_death_position_unavailable:${participantKey(participant)}:${event.time}`);
        continue;
      }
      const distance = distanceBetween(position, eventPosition);
      if (distance > NEARBY_RADIUS) continue;
      nearbyDeaths.push({ time: event.time, participant, position: eventPosition, distance });
      if (isEnemy) tradedLocally = true;
    }
  }

  for (const event of Array.isArray(playback?.killEvents) ? playback.killEvents : []) {
    if (!finite(event?.time) || Math.abs(event.time - time) > LOCAL_TRADE_WINDOW) continue;
    const eventPosition = positionForEvent(event, playback);
    if (!eventPosition || !position) {
      addUnavailable(unavailable, `nearby_kill_position_unavailable:${event.time}`);
      continue;
    }
    const distance = distanceBetween(position, eventPosition);
    if (distance > NEARBY_RADIUS) continue;
    nearbyKills.push({
      time: event.time,
      participant: participantForKillTarget(participants, event, selectedSide),
      position: eventPosition,
      distance,
    });
  }

  return {
    nearbyDeaths: nearbyDeaths.sort((left, right) => left.time - right.time),
    nearbyKills: nearbyKills.sort((left, right) => left.time - right.time),
    tradedLocally: tradedLocally ? true : tradeComplete ? false : null,
  };
}

function defensiveItemObservation(playback, catalog, time, unavailable) {
  if (!Array.isArray(playback?.itemUsedEvents)) return null;
  const checked = timedInWindow(playback.itemUsedEvents, time - DEFENSIVE_ITEM_WINDOW, time);
  const names = checked.map((event) => ({ event, name: entityRef(catalog, 'item', event.itemId).name }));
  if (names.some(({ name }) => DEFENSIVE_ITEM_NAMES.has(name))) return true;
  const unresolved = names.filter(({ name }) => name == null);
  for (const { event } of unresolved) {
    addUnavailable(unavailable, `selected_item_name_unavailable:${event.itemId ?? 'unknown'}`);
  }
  return unresolved.length > 0 ? null : false;
}

export function latestPositionAt(points, time) {
  const candidates = (Array.isArray(points) ? points : [])
    .filter((point) => finite(point?.time)
      && finite(point?.x)
      && finite(point?.y)
      && point.time <= time
      && time - point.time <= POSITION_MAX_AGE)
    .sort((left, right) => right.time - left.time);
  if (candidates.length === 0) return null;
  const point = candidates[0];
  return { time: point.time, x: point.x, y: point.y, ageSeconds: time - point.time };
}

export function buildDeathPatterns(contexts = []) {
  const observationNames = [
    'isolated',
    'afterConfirmedTeleport',
    'firstAlliedDeathInFight',
    'tradedLocally',
    'ownDefensiveItemUsed',
  ];
  const groups = new Map();
  for (const context of contexts) {
    const signature = observationNames
      .filter((name) => context?.observations?.[name] === true)
      .sort()
      .join('+');
    if (!signature) continue;
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(context);
  }
  return [...groups.entries()]
    .filter(([, deaths]) => deaths.length >= 2)
    .map(([signature, deaths]) => {
      const representative = [...deaths].sort((left, right) =>
        (right.timeDead ?? -1) - (left.timeDead ?? -1)
        || right.time - left.time)[0];
      return {
        signature,
        times: deaths.map((death) => death.time).sort((left, right) => left - right),
        count: deaths.length,
        representativeDeathTime: representative.time,
      };
    })
    .sort((left, right) => right.count - left.count
      || right.representativeDeathTime - left.representativeDeathTime);
}

export function selectPriorityDeath({ contexts = [], patterns = [], turningWindow = null } = {}) {
  if (patterns.length > 0) return patterns[0].representativeDeathTime;
  const inTurningWindow = contexts.filter((context) =>
    finite(turningWindow?.start)
      && finite(turningWindow?.end)
      && context.time >= turningWindow.start
      && context.time <= turningWindow.end);
  const candidates = inTurningWindow.length > 0 ? inTurningWindow : contexts;
  const selected = [...candidates].sort((left, right) =>
    (right.timeDead ?? -1) - (left.timeDead ?? -1)
    || right.time - left.time)[0];
  return selected?.time ?? null;
}

export function buildDeathContexts({
  selectedAccountId,
  participants = [],
  stratzPlayers = [],
  teamfights = null,
  selectedRepositions = null,
  durationSeconds,
  catalog,
  scoreboardDeaths = null,
} = {}) {
  const selected = selectedPlayer(stratzPlayers, selectedAccountId);
  const participant = selectedParticipant(participants, selectedAccountId);
  const selectedSide = participant?.side ?? null;
  const playback = selected?.playbackData;
  const contexts = validDeaths(playback?.deathEvents, durationSeconds).map((death) => {
    const position = latestPositionAt(playback?.playerUpdatePositionEvents, death.time);
    const teamfight = teamfightAt(teamfights, death.time);
    const unavailable = unavailableFor({ playback, position, death, teamfights, selectedRepositions });
    if (!participant) addUnavailable(unavailable, 'selected_participant_unavailable');
    const proximity = participantProximity({
      participants,
      stratzPlayers,
      selectedAccountId,
      selectedSide,
      position,
      time: death.time,
      unavailable,
    });
    const recentReposition = recentRepositionAt(selectedRepositions, death.time, catalog);
    const local = localEvents({
      participants,
      stratzPlayers,
      selectedAccountId,
      selectedSide,
      playback,
      position,
      time: death.time,
      unavailable,
    });
    const observations = {
      isolated: proximity.complete
        ? proximity.nearbyAllies.length === 0 && proximity.nearbyEnemies.length >= 2
        : null,
      afterConfirmedTeleport: Array.isArray(selectedRepositions)
        ? selectedRepositions.some((move) => finite(move?.time)
          && move.time <= death.time
          && death.time - move.time <= DEATH_WINDOW_BEFORE
          && move.cause === 'teleport_item')
        : null,
      firstAlliedDeathInFight: firstAlliedDeathObservation({
        participants,
        stratzPlayers,
        selectedAccountId,
        selectedSide,
        teamfight,
        time: death.time,
        unavailable,
      }),
      tradedLocally: local.tradedLocally,
      ownDefensiveItemUsed: defensiveItemObservation(playback, catalog, death.time, unavailable),
      contextIncomplete: false,
    };
    observations.contextIncomplete = unavailable.length > 0;
    return {
      time: death.time,
      position,
      killerHero: entityRef(catalog, 'hero', death.attacker),
      killingAbility: entityRef(catalog, 'ability', death.byAbility),
      killingItem: entityRef(catalog, 'item', death.byItem),
      timeDead: finite(death.timeDead) ? death.timeDead : null,
      teamfight,
      nearbyAllies: proximity.nearbyAllies,
      nearbyEnemies: proximity.nearbyEnemies,
      ownAbilityUses: ownEntityUses(playback?.abilityUsedEvents, death.time - DEATH_WINDOW_BEFORE, death.time + DEATH_WINDOW_AFTER, 'ability', catalog),
      ownItemUses: ownEntityUses(playback?.itemUsedEvents, death.time - DEATH_WINDOW_BEFORE, death.time + DEATH_WINDOW_AFTER, 'item', catalog),
      recentReposition,
      nearbyDeaths: local.nearbyDeaths,
      nearbyKills: local.nearbyKills,
      observations,
      unavailable,
    };
  });
  const knownScoreboardDeaths = Number.isInteger(scoreboardDeaths) ? scoreboardDeaths : 0;
  return { contexts, unresolvedCount: Math.max(0, knownScoreboardDeaths - contexts.length) };
}

export function buildDeathAnalysis(input = {}) {
  const base = buildDeathContexts(input);
  const patterns = buildDeathPatterns(base.contexts);
  return {
    ...base,
    patterns,
    priorityDeathTime: selectPriorityDeath({
      contexts: base.contexts,
      patterns,
      turningWindow: input.turningWindow,
    }),
  };
}

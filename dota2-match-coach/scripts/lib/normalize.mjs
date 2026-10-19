import { rankLabel } from './rank.mjs';
import { bracketLabelFor, positionEnumFor } from './baseline.mjs';
import { GAME_MODES, LOBBY_TYPES, resolveVocabularyField } from './vocabulary.mjs';
import { buildEntityCatalog, entityRef } from './entities.mjs';
import { normalizeParticipants, resolveLaneMatchup } from './lane.mjs';
import { buildDeathAnalysis, stratzPlayerForParticipant } from './deaths.mjs';
import { EARLIEST_EVENT_TIME, openDotaKills, openPlayerForSlot } from './opendota-deaths.mjs';
import { abandonsFrom, buildPercentiles, buildPlayersTable, modeClassFor } from './match-players.mjs';
import { computeCapabilities, qualityFromCapabilities } from './capabilities.mjs';
import { alignMinuteSeries } from './series.mjs';
import { buildBuybacks, buildObjectives, buildSkillBuild, buildTeamEconomy, buildWards } from './match-context.mjs';
import { buildMechanics, mechanicsEntityNames } from './mechanics.mjs';

const SCHEMA_VERSION = '2.4.0';
const PHASES = [
  { id: 'lane', clockId: 'minutes_0_10', start: 0, end: 600 },
  { id: 'transition', clockId: 'minutes_10_15', start: 600, end: 900 },
  { id: 'midgame', clockId: 'minutes_15_25', start: 900, end: 1500 },
  { id: 'closing', clockId: 'minutes_25_end', start: 1500, end: Infinity },
];
// Shorter intervals have too few samples to rank against whole phases.
const EXTREMA_MIN_PHASE_SECONDS = 180;
// Scoreboard totals that end the final interval when the match does not end on
// a minute: they share the per-minute series' definition. Earned gold and XP do
// not (GPM counts gold the series leaves out), so those end at the last sample.
const FINAL_TOTALS = new Map([['lh_t', 'last_hits'], ['dn_t', 'denies'], ['hero_damage_t', 'hero_damage']]);

const SERIES_METRICS = [
  ['gold', 'gold_t', 'goldPerMin'],
  ['xp', 'xp_t', 'xpPerMin'],
  ['lh', 'lh_t', 'lhPerMin'],
  ['denies', 'dn_t', 'deniesPerMin'],
  ['heroDamage', 'hero_damage_t', 'heroDamagePerMin'],
];
const EVENT_METRICS = [['kills', 'killEvents'], ['deaths', 'deathEvents'], ['assists', 'assistEvents']];
// Per-minute OpenDota series that share the replay's interval ticks.
const OPEN_MINUTE_SERIES = new Map([
  ['gold_t', 'gold'],
  ['xp_t', 'XP'],
  ['lh_t', 'last hits'],
  ['dn_t', 'denies'],
  ['hero_damage_t', 'hero damage'],
  ['networth_t', 'net worth'],
]);
// Comparable rows: the player's per-minute row on the left, the STRATZ sample metric
// on the right. OpenDota `gold_t` is accumulated gold, not net worth: in match
// 8963443105 the last point of the row is 12772 while `net_worth` is 11150, so it
// never stands in for the `networth` baseline. Net worth is compared only through
// `networth_t`, the replay's own per-minute net worth, which newer OpenDota parses
// record and older ones leave empty. The `crossSourceProxy` flag stays in the
// schema for future rows and is currently set by none.
const BASELINE_COMPARISONS = [
  { metric: 'lastHits', playerSeries: 'lh_t', baselineMetric: 'cs', crossSourceProxy: false },
  { metric: 'denies', playerSeries: 'dn_t', baselineMetric: 'dn', crossSourceProxy: false },
  { metric: 'xp', playerSeries: 'xp_t', baselineMetric: 'xp', crossSourceProxy: false },
  { metric: 'heroDamage', playerSeries: 'hero_damage_t', baselineMetric: 'heroDamage', crossSourceProxy: false },
  { metric: 'netWorth', playerSeries: 'networth_t', baselineMetric: 'networth', crossSourceProxy: false },
];
const BASELINE_MINUTES = [10, 15, 25];
const BASELINE_MAX_MINUTE = 75;
const BASELINE_MIN_SAMPLE = 200;

// A jump in the position row does not by itself prove the player teleported:
// stepping into an ally's warp and being moved by someone else's ability look the
// same. The cause is read from the player's own item and ability uses near the
// arrival; an unrecognized jump stays `unattributed` and is never called a teleport.
const TELEPORT_ITEM_IDS = new Set([46, 48, 220]);
const ALLY_WARP_ABILITY_IDS = new Set([842]);
// Minimap cells: on foot the maximum is about 4.3 cells per second at the 550
// movement speed cap, so the speed threshold of 6 separates a relocation from
// running, and the distance threshold damps coordinate jitter over short intervals.
const REPOSITION_MIN_DISTANCE = 15;
const REPOSITION_MIN_SPEED = 6;
const REPOSITION_CAUSE_WINDOW = 15;

// Purchases start before the horn: the starting items are bought in the pre-game
// window at negative timestamps. Dropping them made a complete item build read as if
// the player had entered the lane with no boots and no starting regeneration at all.
export const PREGAME_PURCHASE_WINDOW_SECONDS = 300;

const EXTREMA_METRICS = SERIES_METRICS.map(([, , rate]) => rate).concat(EVENT_METRICS.map(([metric]) => metric));

export class NormalizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NormalizationError';
    this.code = code;
  }
}

function sourced(value, source) {
  return { value: value ?? null, source: value == null ? null : source };
}

function rankField(code) {
  const field = sourced(code, 'stratz');
  field.label = field.value == null ? null : rankLabel(field.value);
  return field;
}

// The player's own medal: OpenDota `rank_tier` and STRATZ `seasonRank` are both
// profile snapshots, not the rank at the time of the match. A disagreement between
// them is not resolved in favour of one source: the code stays unknown and the
// baseline falls back to the match average bracket, which is knowingly wider.
function playerRankFor(openPlayer, stratzPlayer, warnings) {
  const field = resolvedField('Player rank', [
    { value: openPlayer?.rank_tier, source: 'opendota' },
    { value: stratzPlayer?.steamAccount?.seasonRank, source: 'stratz' },
  ], warnings);
  field.label = field.value == null ? null : rankLabel(field.value);
  return field;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sourceSummary(result) {
  if (!result) return { status: 'unavailable', reason: 'not_requested' };
  const summary = { status: result.status ?? 'unavailable' };
  if (result.reason != null) summary.reason = result.reason;
  if (result.error?.code != null) summary.error = { code: result.error.code };
  if (result.parse) summary.parse = { requested: Boolean(result.parse.requested), state: result.parse.state ?? null };
  if (result.status === 'ready' && result.isCurrentExactPatch != null) {
    summary.matchPatch = result.matchPatch ?? null;
    summary.currentPatch = result.currentPatch ?? null;
    summary.isCurrentExactPatch = result.isCurrentExactPatch;
  }
  return summary;
}

function hasParsedMatch(match) {
  return Number.isInteger(match?.version);
}

function playersFor(result) {
  return result?.status === 'ready' && Array.isArray(result.match?.players)
    ? result.match.players.filter((player) => player && typeof player === 'object')
    : [];
}

function byAccount(players, accountId, field) {
  return players.filter((player) => String(player[field]) === String(accountId));
}

// The selected player is a match slot. An account ID, a slot and a hero each
// name one slot; every selector given must name the same one. A player who hides
// their match data has no account ID in OpenDota, so a hero or slot still selects
// them, and the two sources are joined through the slot rather than the account.
function resolveSelection({ accountId, slot, heroId }, participants, openDota, stratz) {
  const slots = [];
  if (accountId != null) {
    const openMatches = byAccount(playersFor(openDota), accountId, 'account_id');
    const stratzMatches = byAccount(playersFor(stratz), accountId, 'steamAccountId');
    if (openMatches.length > 1 || stratzMatches.length > 1) {
      throw new NormalizationError('account_ambiguous', `Account ${accountId} appears more than once`);
    }
    const matches = participants.filter((participant) => participant.accountId === accountId);
    if (matches.length > 1) throw new NormalizationError('account_ambiguous', `Account ${accountId} appears more than once`);
    if (matches.length === 0) throw new NormalizationError('account_not_found', `Account ${accountId} was not found in available match data`);
    slots.push(matches[0].slot);
  }
  if (heroId != null) {
    const matches = participants.filter((participant) => participant.hero?.id === heroId);
    if (matches.length > 1) throw new NormalizationError('hero_ambiguous', 'Hero appears more than once');
    if (matches.length === 0) throw new NormalizationError('hero_not_in_match', 'Hero is not in this match');
    slots.push(matches[0].slot);
  }
  if (slot != null) {
    const participant = participants[slot];
    if (!participant || (participant.hero?.id == null && participant.accountId == null)) {
      throw new NormalizationError('slot_empty', 'Slot has no player in available match data');
    }
    slots.push(slot);
  }
  if (slots.length === 0) throw new NormalizationError('invalid_arguments', 'No player selector');
  if (new Set(slots).size > 1) throw new NormalizationError('selector_conflict', 'Selectors name different players');
  const participant = participants[slots[0]];
  return {
    participant,
    openPlayer: openPlayerForSlot(playersFor(openDota), participant.slot) ?? undefined,
    stratzPlayer: stratzPlayerForParticipant(playersFor(stratz), participant) ?? undefined,
  };
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolvedField(label, candidates, warnings, normalize = (value) => value) {
  const available = candidates
    .filter((candidate) => candidate.value != null)
    .map((candidate) => ({ ...candidate, canonical: normalize(candidate.value) }));
  if (available.length === 0) return sourced(null, null);
  if (available.every((candidate) => sameValue(candidate.canonical, available[0].canonical))) {
    return sourced(available[0].canonical, available[0].source);
  }
  warnings.push(`${label} conflict between ${available.map((candidate) => candidate.source).join(' and ')}.`);
  return {
    value: null,
    source: null,
    candidates: available.map(({ value, source }) => ({ value, source })),
  };
}

function positionFor(openPlayer, stratzPlayer, warnings) {
  return resolvedField('Position', [
    { value: openPlayer?.position_est, source: 'opendota' },
    { value: stratzPlayer?.position, source: 'stratz' },
  ], warnings, (value) => {
    const match = typeof value === 'string' && /^POSITION_([1-5])$/.exec(value);
    return match ? Number(match[1]) : value;
  });
}

function sideFor(openPlayer, stratzPlayer, warnings) {
  return resolvedField('Side', [
    { value: finiteNumber(openPlayer?.player_slot) ? (openPlayer.player_slot < 128 ? 'radiant' : 'dire') : null, source: 'opendota' },
    { value: typeof stratzPlayer?.isRadiant === 'boolean' ? (stratzPlayer.isRadiant ? 'radiant' : 'dire') : null, source: 'stratz' },
  ], warnings);
}

function resultCandidates(openPlayer, stratzPlayer, openDota, stratz) {
  const openResult = typeof openDota?.match?.radiant_win === 'boolean' && finiteNumber(openPlayer?.player_slot)
    ? ((openPlayer.player_slot < 128) === openDota.match.radiant_win ? 'win' : 'loss') : null;
  const stratzResult = typeof stratz?.match?.didRadiantWin === 'boolean' && typeof stratzPlayer?.isRadiant === 'boolean'
    ? (stratzPlayer.isRadiant === stratz.match.didRadiantWin ? 'win' : 'loss') : null;
  return [{ value: openResult, source: 'opendota' }, { value: stratzResult, source: 'stratz' }];
}

function seriesSampleAt(series, seconds) {
  if (!Array.isArray(series) || series.length === 0) return null;
  for (let index = Math.min(Math.floor(seconds / 60), series.length - 1); index >= 0; index -= 1) {
    if (finiteNumber(series[index])) return { value: series[index], index };
  }
  return null;
}

function countEvents(events, start, end) {
  if (!Array.isArray(events)) return null;
  return events.filter((event) => finiteNumber(event?.time) && event.time >= start && event.time < end).length;
}

function intervalLabel(start, end) {
  const formatEndpoint = (seconds) => {
    const wholeSeconds = Math.floor(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const remainder = wholeSeconds % 60;
    return remainder === 0 ? String(minutes) : `${minutes}:${String(remainder).padStart(2, '0')}`;
  };
  return `${formatEndpoint(start)}–${formatEndpoint(end)}`;
}

function addExtrema(phases) {
  for (const phase of phases) phase.extremaWithinMatch = [];
  const ranked = phases.filter((phase) => phase.end - phase.start >= EXTREMA_MIN_PHASE_SECONDS);
  for (const metric of EXTREMA_METRICS) {
    const available = ranked.filter((phase) => finiteNumber(phase.metrics[metric]));
    if (available.length < 2) continue;
    const values = available.map((phase) => phase.metrics[metric]);
    const highest = Math.max(...values);
    const lowest = Math.min(...values);
    for (const phase of available) {
      if (phase.metrics[metric] === highest) phase.extremaWithinMatch.push(`${metric}:max`);
      if (phase.metrics[metric] === lowest) phase.extremaWithinMatch.push(`${metric}:min`);
    }
  }
  return phases;
}

// The change of a cumulative series over [start, end). The final interval of a
// match that does not end on a minute closes on the scoreboard total when that
// total shares the series' definition, and otherwise on the last sample, with the
// rate taken over the time the samples actually cover.
function phaseDelta(player, seriesKey, start, end, duration) {
  const series = player?.[seriesKey];
  const startSample = seriesSampleAt(series, start);
  if (startSample == null || startSample.index * 60 !== start) return { delta: null, seconds: null };
  const total = FINAL_TOTALS.has(seriesKey) ? player?.[FINAL_TOTALS.get(seriesKey)] : null;
  if (end === duration && end % 60 !== 0 && finiteNumber(total)) {
    const last = seriesSampleAt(series, end);
    if (last != null && total >= last.value) return { delta: total - startSample.value, seconds: end - start };
  }
  // The series must reach the interval's last whole minute; a series that stops
  // earlier would report part of the interval as the whole of it.
  const endMinute = Math.floor(end / 60);
  const endSample = seriesSampleAt(series, end);
  if (endSample == null || endSample.index !== endMinute || endMinute * 60 <= start) return { delta: null, seconds: null };
  return { delta: endSample.value - startSample.value, seconds: endMinute * 60 - start };
}

export function buildPhases(player = {}, stratzPlayer, durationSeconds, { clockOnly = false, openEvents = {} } = {}) {
  const duration = finiteNumber(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const playback = stratzPlayer?.playbackData ?? {};
  const eventsFor = (metric, eventKey) => (Array.isArray(playback[eventKey]) ? playback[eventKey] : openEvents[metric] ?? null);
  const phases = PHASES
    .map((definition) => ({ ...definition, end: Math.min(definition.end, duration) }))
    .filter((definition) => definition.start < definition.end)
    .map(({ id, clockId, start, end }) => {
      const metrics = {};
      for (const [metric, seriesKey, rateMetric] of SERIES_METRICS) {
        const { delta, seconds } = phaseDelta(player, seriesKey, start, end, duration);
        metrics[metric] = delta;
        metrics[rateMetric] = delta == null || !(seconds >= 60) ? null : Number((delta / (seconds / 60)).toFixed(2));
      }
      // Events before the horn belong to the first interval.
      const from = start === 0 ? EARLIEST_EVENT_TIME : start;
      for (const [metric, eventKey] of EVENT_METRICS) metrics[metric] = countEvents(eventsFor(metric, eventKey), from, end === duration ? end + 1 : end);
      // A final interval that ends between minutes: series without a matching
      // scoreboard total stop at the last whole minute.
      const minuteSeriesEnd = end === duration && end % 60 !== 0 && Math.floor(end / 60) * 60 > start ? Math.floor(end / 60) * 60 : null;
      return {
        id: clockOnly ? clockId : id, start, end, interval: intervalLabel(start, end), metrics, extremaWithinMatch: [],
        ...(minuteSeriesEnd == null ? {} : { minuteSeriesEnd }),
      };
    });
  return addExtrema(phases);
}

function draftCandidate(source, radiantIds, direIds) {
  const radiant = [...new Set(radiantIds.filter(finiteNumber))];
  const dire = [...new Set(direIds.filter(finiteNumber))];
  const complete = radiant.length === 5 && dire.length === 5 && new Set([...radiant, ...dire]).size === 10;
  return { source, radiant, dire, complete };
}

function draftFor(openDota, stratz, catalog) {
  const pickBans = stratz?.status === 'ready' && Array.isArray(stratz.match?.pickBans) ? stratz.match.pickBans : [];
  const stratzPicks = pickBans.filter((pick) => pick?.isPick === true && typeof pick?.isRadiant === 'boolean');
  const openPlayers = playersFor(openDota).filter((player) => finiteNumber(player?.player_slot));
  const candidates = [
    draftCandidate('stratz', stratzPicks.filter((pick) => pick.isRadiant).map((pick) => pick.heroId), stratzPicks.filter((pick) => !pick.isRadiant).map((pick) => pick.heroId)),
    draftCandidate('opendota', openPlayers.filter((player) => player.player_slot < 128).map((player) => player.hero_id), openPlayers.filter((player) => player.player_slot >= 128).map((player) => player.hero_id)),
  ];
  const selected = candidates.find((candidate) => candidate.complete)
    ?? [...candidates].sort((left, right) => (right.radiant.length + right.dire.length) - (left.radiant.length + left.dire.length))[0];
  const complete = candidates.filter((candidate) => candidate.complete);
  const signatures = complete.map((candidate) => `${candidate.radiant.slice().sort((a, b) => a - b)}|${candidate.dire.slice().sort((a, b) => a - b)}`);
  const warnings = new Set(signatures).size > 1 ? ['Draft conflict between complete OpenDota and STRATZ sides.'] : [];
  const pickRef = (heroId, source) => sourced(entityRef(catalog, 'hero', heroId), source);
  const radiant = selected.radiant.map((heroId) => pickRef(heroId, selected.source));
  const dire = selected.dire.map((heroId) => pickRef(heroId, selected.source));
  const draft = { radiant, dire, picks: [...radiant, ...dire], complete: selected.complete };
  if (new Set(signatures).size > 1) {
    draft.candidates = complete.map((candidate) => ({
      source: candidate.source,
      radiant: candidate.radiant.map((heroId) => pickRef(heroId, candidate.source)),
      dire: candidate.dire.map((heroId) => pickRef(heroId, candidate.source)),
    }));
  }
  return { draft, warnings };
}

function safeEvent(event, fields, source, duration, timeField = 'time', minTime = 0) {
  if (!event || !finiteNumber(event[timeField]) || !finiteNumber(duration)
    || event[timeField] < minTime || event[timeField] > duration) return null;
  const projected = { [timeField]: event[timeField] };
  for (const field of fields) {
    const value = event[field];
    if (value == null || !['string', 'number', 'boolean'].includes(typeof value)) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    projected[field] = value;
  }
  projected.source = source;
  return projected;
}

function timedEvents(events, fields, duration, minTime = 0) {
  return Array.isArray(events)
    ? events.map((event) => safeEvent(event, fields, 'stratz', duration, 'time', minTime)).filter(Boolean)
    : [];
}

function eventTimeline(openDota, stratzPlayer, duration) {
  const playback = stratzPlayer?.playbackData ?? {};
  const teamfights = openDota?.status === 'ready' && Array.isArray(openDota.match?.teamfights)
    ? openDota.match.teamfights
      .filter((fight) => finiteNumber(duration) && finiteNumber(fight?.start) && finiteNumber(fight?.end)
        && fight.start >= 0 && fight.start <= fight.end && fight.end <= duration)
      .map((fight) => ({ start: fight.start, end: fight.end, source: 'opendota' }))
    : [];
  return {
    kills: timedEvents(playback.killEvents, ['target', 'byAbility', 'byItem', 'positionX', 'positionY', 'isGank', 'isSmoke'], duration, EARLIEST_EVENT_TIME),
    deaths: timedEvents(playback.deathEvents, ['attacker', 'byAbility', 'byItem', 'positionX', 'positionY', 'timeDead', 'isFeed'], duration, EARLIEST_EVENT_TIME),
    assists: timedEvents(playback.assistEvents, ['target', 'positionX', 'positionY'], duration, EARLIEST_EVENT_TIME),
    cs: timedEvents(playback.csEvents, ['npcId', 'byAbility', 'byItem', 'gold', 'xp', 'positionX', 'positionY', 'isCreep', 'isNeutral', 'isAncient'], duration),
    purchases: timedEvents(playback.purchaseEvents, ['itemId'], duration, -PREGAME_PURCHASE_WINDOW_SECONDS),
    runes: timedEvents(playback.runeEvents, ['rune', 'action', 'gold', 'positionX', 'positionY'], duration),
    abilityUses: timedEvents(playback.abilityUsedEvents, ['abilityId'], duration),
    itemUses: timedEvents(playback.itemUsedEvents, ['itemId'], duration),
    positions: timedEvents(playback.playerUpdatePositionEvents, ['x', 'y'], duration),
    teamfights,
    objectives: [],
  };
}

function lastCauseWithin(events, arrival, match) {
  let found = null;
  for (const event of events) {
    if (!finiteNumber(event?.time) || event.time > arrival) continue;
    if (arrival - event.time > REPOSITION_CAUSE_WINDOW) continue;
    if (!match(event)) continue;
    if (!found || event.time > found.time) found = event;
  }
  return found;
}

// The cause closest to the arrival wins: a scroll used a minute earlier for another
// purpose must not override stepping into an ally's warp, and vice versa.
function attributeReposition(from, to, itemUses, abilityUses) {
  const base = { time: to.time, fromX: from.x, fromY: from.y, x: to.x, y: to.y, source: 'stratz' };
  const warp = lastCauseWithin(abilityUses, to.time, (event) => ALLY_WARP_ABILITY_IDS.has(event.abilityId));
  const teleport = lastCauseWithin(itemUses, to.time, (event) => TELEPORT_ITEM_IDS.has(event.itemId));
  if (warp && (!teleport || warp.time >= teleport.time)) {
    return { ...base, cause: 'ally_warp', causeTime: warp.time, causeAbilityId: warp.abilityId };
  }
  if (teleport) return { ...base, cause: 'teleport_item', causeTime: teleport.time, causeItemId: teleport.itemId };
  return { ...base, cause: 'unattributed' };
}

// The player's relocations, reconstructed from the position row and labelled with
// their cause. A respawn never lands here: a death lies between the two points.
function repositionsFor(events) {
  const positions = (Array.isArray(events?.positions) ? events.positions : [])
    .filter((point) => finiteNumber(point?.time) && finiteNumber(point?.x) && finiteNumber(point?.y));
  const deaths = Array.isArray(events?.deaths) ? events.deaths : [];
  const itemUses = Array.isArray(events?.itemUses) ? events.itemUses : [];
  const abilityUses = Array.isArray(events?.abilityUses) ? events.abilityUses : [];
  const repositions = [];
  for (let index = 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    const seconds = to.time - from.time;
    if (!(seconds > 0)) continue;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < REPOSITION_MIN_DISTANCE || distance / seconds < REPOSITION_MIN_SPEED) continue;
    if (deaths.some((death) => finiteNumber(death?.time) && death.time > from.time && death.time < to.time)) continue;
    repositions.push(attributeReposition(from, to, itemUses, abilityUses));
  }
  return repositions;
}

function eventInventory(events) {
  const any = (name) => Array.isArray(events?.[name]) && events[name].length > 0;
  return {
    timedEvents: Object.values(events ?? {}).some((value) => Array.isArray(value) && value.length > 0),
    deaths: any('deaths'),
    positions: any('positions'),
    fights: any('teamfights'),
    runes: any('runes'),
    abilityUses: any('abilityUses'),
    repositions: any('repositions'),
  };
}

function arraySeries(values, minuteBasis = null) {
  return {
    values: Array.isArray(values) ? values.map((value) => finiteNumber(value) ? value : null) : [],
    source: Array.isArray(values) ? 'opendota' : null,
    minuteBasis: Array.isArray(values) ? minuteBasis : null,
  };
}

// A copy of the selected OpenDota player whose per-minute series are keyed by
// minute. Every consumer below (stages, peer rows, stored series) reads this copy,
// so a replay whose ticks start after 0:00 cannot shift a 10-minute marker.
function minuteAlignedPlayer(openPlayer, warnings) {
  if (!openPlayer || typeof openPlayer !== 'object') return { player: openPlayer, basis: {} };
  const player = { ...openPlayer };
  const basis = {};
  const dropped = [];
  for (const [key, label] of OPEN_MINUTE_SERIES) {
    if (!Object.hasOwn(openPlayer, key)) continue;
    const aligned = alignMinuteSeries(openPlayer[key], openPlayer.times);
    player[key] = aligned.values ?? undefined;
    basis[key] = aligned.basis;
    if (aligned.basis === 'inconsistent') dropped.push(label);
  }
  if (dropped.length > 0) {
    warnings.push(`OpenDota sample times disagree with the per-minute ${dropped.join(', ')} series; those series are unavailable.`);
  }
  return { player, basis };
}

// STRATZ records one outcome per physical lane. The selected lane is already placed
// on the map through the player's own side, so a safe or off lane reads its own
// outcome instead of the one across the map. A lane in source conflict reads none.
const LANE_OUTCOME_FIELDS = new Map([['top', 'topLaneOutcome'], ['mid', 'midLaneOutcome'], ['bottom', 'bottomLaneOutcome']]);

function laneOutcomeFor(lane, stratz) {
  const field = LANE_OUTCOME_FIELDS.get(lane.selectedLane);
  if (!field || lane.reason === 'source_conflict' || stratz?.status !== 'ready') return sourced(null, null);
  const outcome = stratz.match?.[field];
  return sourced(typeof outcome === 'string' ? outcome : null, 'stratz');
}

// The outcome names the winning side, so one label reads opposite for the two teams.
// It is restated from the selected side; an unknown side or an unlisted value stays
// null rather than guessed.
const SELECTED_SIDE_LANE_OUTCOMES = new Map([
  ['TIE', { radiant: 'tie', dire: 'tie' }],
  ['RADIANT_VICTORY', { radiant: 'won', dire: 'lost' }],
  ['RADIANT_STOMP', { radiant: 'won_by_stomp', dire: 'lost_by_stomp' }],
  ['DIRE_VICTORY', { radiant: 'lost', dire: 'won' }],
  ['DIRE_STOMP', { radiant: 'lost_by_stomp', dire: 'won_by_stomp' }],
]);

function laneWithOutcome(lane, stratz, side) {
  const outcome = laneOutcomeFor(lane, stratz);
  return { ...lane, outcome, selectedSideOutcome: SELECTED_SIDE_LANE_OUTCOMES.get(outcome.value)?.[side] ?? null };
}

// An empty slot is 0 in OpenDota and null in STRATZ. Both mean no item, so neither
// becomes an unnamed item or a false disagreement between the two inventories.
function finalInventoryFor(openPlayer, stratzPlayer, warnings, catalog) {
  const itemId = (value) => finiteNumber(value) && value > 0;
  const openItems = Array.from({ length: 6 }, (_, index) => openPlayer?.[`item_${index}`]).filter(itemId);
  const stratzItems = Array.from({ length: 6 }, (_, index) => stratzPlayer?.[`item${index}Id`]).filter(itemId);
  const conflict = openItems.length > 0 && stratzItems.length > 0 && !sameValue(openItems, stratzItems);
  if (conflict) warnings.push('Final inventory conflict between opendota and stratz.');
  const values = openItems.length > 0 ? openItems : stratzItems;
  const source = openItems.length > 0 ? 'opendota' : 'stratz';
  const result = { finalInventory: values.map((value) => sourced(entityRef(catalog, 'item', value), source)) };
  if (conflict) {
    result.finalInventoryCandidates = [
      { source: 'opendota', items: openItems.map((value) => sourced(entityRef(catalog, 'item', value), 'opendota')) },
      { source: 'stratz', items: stratzItems.map((value) => sourced(entityRef(catalog, 'item', value), 'stratz')) },
    ];
  }
  return result;
}

function purchaseItemRef(entry, catalog, entityConstants) {
  const itemId = finiteNumber(entry?.item_id)
    ? entry.item_id
    : entityConstants?.items?.[entry?.key]?.id;
  return entityRef(catalog, 'item', itemId);
}

function purchasesFor(openPlayer, stratzPlayer, duration, catalog, entityConstants) {
  const inWindow = (time) => finiteNumber(duration) && finiteNumber(time)
    && time >= -PREGAME_PURCHASE_WINDOW_SECONDS && time <= duration;
  const open = Array.isArray(openPlayer?.purchase_log) ? openPlayer.purchase_log
    .filter((entry) => inWindow(entry?.time) && (typeof entry?.key === 'string' || finiteNumber(entry?.item_id)))
    .map((entry) => ({ time: entry.time, item: purchaseItemRef(entry, catalog, entityConstants), source: 'opendota' })) : [];
  const stratz = Array.isArray(stratzPlayer?.playbackData?.purchaseEvents)
    ? stratzPlayer.playbackData.purchaseEvents
      .filter((event) => inWindow(event?.time) && finiteNumber(event?.itemId))
      .map((event) => ({ time: event.time, item: entityRef(catalog, 'item', event.itemId), source: 'stratz' }))
    : [];
  // Both sources log the same purchases; merging them listed every item twice.
  return (Array.isArray(openPlayer?.purchase_log) ? open : stratz)
    .sort((left, right) => left.time - right.time);
}


function baselineMinutes(duration) {
  const final = finiteNumber(duration) ? Math.floor(duration / 60) : null;
  const minutes = [...BASELINE_MINUTES, final]
    .filter((minute) => Number.isInteger(minute) && minute >= 1 && minute <= BASELINE_MAX_MINUTE)
    .filter((minute) => !finiteNumber(duration) || minute * 60 <= duration);
  return [...new Set(minutes)].sort((left, right) => left - right);
}

function completeDeathTimeline(deaths, scoreboardDeaths, duration) {
  if (!Array.isArray(deaths) || !Number.isInteger(scoreboardDeaths) || scoreboardDeaths < 0
    || deaths.length !== scoreboardDeaths || !finiteNumber(duration) || duration < 0) return false;
  if (!deaths.every((death) => finiteNumber(death?.time) && death.time >= EARLIEST_EVENT_TIME && death.time <= duration)) return false;
  return new Set(deaths.map((death) => death.time)).size === deaths.length;
}

function cumulativeDeathsAt(deathTimes, minute) {
  if (!Array.isArray(deathTimes)) return null;
  return deathTimes.filter((time) => time <= minute * 60).length;
}

function metricSampleSize(point, metric) {
  // Legacy/direct points without the map describe one sample shared by all
  // metrics. Once the map exists, a missing entry is unknown, never a fallback.
  const sampleSize = Object.hasOwn(point, 'metricSampleSizes') ? point.metricSampleSizes?.[metric] : point.matchCount;
  return finiteNumber(sampleSize) && sampleSize >= BASELINE_MIN_SAMPLE && sampleSize <= point.matchCount ? sampleSize : null;
}

function comparisonRow({ metric, minute, playerValue, baselineValue, matchCount, crossSourceProxy }) {
  const delta = playerValue - baselineValue;
  return {
    metric,
    minute,
    player: playerValue,
    baseline: baselineValue,
    delta: Number(delta.toFixed(2)),
    ratio: baselineValue === 0 ? null : Number((playerValue / baselineValue).toFixed(3)),
    matchCount,
    crossSourceProxy,
    source: 'stratz',
  };
}

export function buildBaseline({ baseline, openPlayer, events, duration, patch, rankCode, position, deathTimelineComplete = false, deathTimes = null }) {
  const empty = { sameHeroPositionRankPatch: null, comparisons: [] };
  if (!baseline || baseline.status !== 'ready') {
    return {
      status: baseline?.status ?? 'unavailable',
      reason: baseline?.reason ?? (baseline ? null : 'not_requested'),
      ...(baseline?.error?.code ? { error: { code: baseline.error.code } } : {}),
      ...empty,
    };
  }
  const minutes = baselineMinutes(duration);
  const byMinute = new Map((baseline.points ?? []).map((point) => [point.minute, point]));
  const points = [];
  const comparisons = [];
  for (const minute of minutes) {
    const point = byMinute.get(minute);
    if (!point || !finiteNumber(point.matchCount) || point.matchCount < BASELINE_MIN_SAMPLE) continue;
    const previousComparisonCount = comparisons.length;
    for (const spec of BASELINE_COMPARISONS) {
      const sample = seriesSampleAt(openPlayer?.[spec.playerSeries], minute * 60);
      const baselineValue = point[spec.baselineMetric];
      const matchCount = metricSampleSize(point, spec.baselineMetric);
      if (!sample || sample.index !== minute || !finiteNumber(baselineValue) || matchCount == null) continue;
      comparisons.push(comparisonRow({
        metric: spec.metric, minute, playerValue: sample.value, baselineValue,
        matchCount, crossSourceProxy: spec.crossSourceProxy,
      }));
    }
    const times = deathTimes ?? (deathTimelineComplete && Array.isArray(events?.deaths) ? events.deaths.map((death) => death.time) : null);
    const playerDeaths = cumulativeDeathsAt(times, minute);
    const deathSampleSize = metricSampleSize(point, 'deaths');
    if (playerDeaths != null && finiteNumber(point.deaths) && deathSampleSize != null) {
      comparisons.push(comparisonRow({
        metric: 'deaths', minute, playerValue: playerDeaths, baselineValue: point.deaths,
        matchCount: deathSampleSize, crossSourceProxy: false,
      }));
    }
    if (comparisons.length > previousComparisonCount) points.push(point);
  }
  if (comparisons.length === 0) return { status: 'unavailable', reason: 'no_comparable_point', ...empty };
  return {
    status: 'ready',
    reason: null,
    sameHeroPositionRankPatch: {
      heroId: baseline.heroId,
      position: baseline.position ?? positionEnumFor(position),
      bracket: baseline.bracket,
      bracketLabel: bracketLabelFor(baseline.bracket),
      bracketSource: baseline.bracketSource ?? null,
      rankCode: finiteNumber(baseline.rankCode) ? baseline.rankCode : finiteNumber(rankCode) ? rankCode : null,
      patch: patch ?? null,
      weeks: Array.isArray(baseline.weeks) ? [...baseline.weeks] : [],
      statistic: 'mean',
      source: 'stratz',
      points,
    },
    comparisons,
  };
}

export function normalizeEvidence({
  matchId,
  accountId = null,
  slot = null,
  heroId: selectedHeroId = null,
  openDota,
  stratz,
  valve,
  baseline,
  mechanics,
  entityConstants,
  generatedAt,
} = {}) {
  const warnings = [];
  // Datafeed names, when fetched, take precedence over community constants.
  const valveNames = mechanicsEntityNames(mechanics);
  const catalog = buildEntityCatalog({ ...entityConstants, valve: valveNames });
  const openPlayers = playersFor(openDota);
  const stratzPlayers = playersFor(stratz);
  const participants = normalizeParticipants({ openPlayers, stratzPlayers, catalog });
  const { participant: selected, openPlayer, stratzPlayer } = resolveSelection(
    { accountId, slot, heroId: selectedHeroId }, participants, openDota, stratz,
  );
  const selectedSlot = selected.slot;
  const selectedAccountId = selected.accountId ?? null;
  const aligned = minuteAlignedPlayer(openPlayer, warnings);
  const lane = resolveLaneMatchup({ participants, selectedSlot });
  const field = (label, openValue, stratzValue) => resolvedField(label, [
    { value: openValue, source: 'opendota' },
    { value: stratzValue, source: 'stratz' },
  ], warnings);
  // Mode and lobby type arrive in different vocabularies, so they bypass `field`.
  const vocabulary = (label, table, openValue, stratzValue) => {
    const resolved = resolveVocabularyField(label, table, { opendota: openValue, stratz: stratzValue });
    warnings.push(...resolved.warnings);
    return resolved.field;
  };
  const durationField = field('Duration', openDota?.match?.duration, stratz?.match?.durationSeconds);
  const duration = durationField.value ?? openDota?.match?.duration ?? stratz?.match?.durationSeconds;
  const gameMode = vocabulary('Game mode', GAME_MODES, openDota?.match?.game_mode, stratz?.match?.gameMode);
  const lobbyType = vocabulary('Lobby type', LOBBY_TYPES, openDota?.match?.lobby_type, stratz?.match?.lobbyType);
  const modeClass = modeClassFor(gameMode.value, lobbyType.value);
  if (modeClass === 'turbo') {
    warnings.push('Turbo match: gold, experience and timings run faster than in normal matchmaking, so no normal-game norm or phase label applies.');
  } else if (modeClass === 'non_standard') {
    warnings.push('Non-standard mode: economy and timings differ from normal matchmaking, so peer norms and percentiles are unavailable and phases are clock intervals only.');
  }
  const parseState = openDota?.parse?.state;
  if (openDota?.status === 'ready' && !hasParsedMatch(openDota.match)) {
    warnings.push(parseState === 'failed'
      ? 'OpenDota finished without parsing the replay (it may not be available yet or has expired); deaths, lane numbers, purchases, fights and team economy are unavailable.'
      : 'OpenDota has not parsed the replay yet; deaths, lane numbers, purchases, fights and team economy stay unavailable until it does. Rerun in 5-10 minutes.');
  }
  if (stratz?.status === 'ready' && stratzPlayers.length > 0 && stratzPlayers.every((row) => row.playbackData == null)) {
    warnings.push('STRATZ returned this match without replay playback, so positions, item and ability uses and death contexts from STRATZ are unavailable.');
  }
  const position = positionFor(openPlayer, stratzPlayer, warnings);
  const side = sideFor(openPlayer, stratzPlayer, warnings);
  const result = resolvedField('Result', resultCandidates(openPlayer, stratzPlayer, openDota, stratz), warnings);
  const draft = draftFor(openDota, stratz, catalog);
  warnings.push(...draft.warnings);

  const summary = {
    kills: field('Kills', openPlayer?.kills, stratzPlayer?.kills),
    deaths: field('Deaths', openPlayer?.deaths, stratzPlayer?.deaths),
    assists: field('Assists', openPlayer?.assists, stratzPlayer?.assists),
    lh: field('Last hits', openPlayer?.last_hits, stratzPlayer?.numLastHits),
    denies: field('Denies', openPlayer?.denies, stratzPlayer?.numDenies),
    gpm: field('GPM', openPlayer?.gold_per_min, stratzPlayer?.goldPerMinute),
    xpm: field('XPM', openPlayer?.xp_per_min, stratzPlayer?.experiencePerMinute),
    netWorth: field('Net worth', openPlayer?.net_worth, stratzPlayer?.networth),
    heroDamage: field('Hero damage', openPlayer?.hero_damage, stratzPlayer?.heroDamage),
    towerDamage: field('Tower damage', openPlayer?.tower_damage, stratzPlayer?.towerDamage),
    healing: field('Healing', openPlayer?.hero_healing, stratzPlayer?.heroHealing),
    imp: sourced(stratzPlayer?.imp, 'stratz'),
  };
  summary.kda = summary.kills.value != null && summary.deaths.value != null && summary.assists.value != null
    ? { kills: summary.kills.value, deaths: summary.deaths.value, assists: summary.assists.value, source: summary.kills.source === summary.deaths.source && summary.kills.source === summary.assists.source ? summary.kills.source : 'multiple' }
    : { kills: null, deaths: null, assists: null, source: null };

  const events = eventTimeline(openDota, stratzPlayer, duration);
  events.repositions = repositionsFor(events);
  const teamfights = openDota?.status === 'ready' && Array.isArray(openDota.match?.teamfights) ? openDota.match.teamfights : null;
  const deathAnalysis = buildDeathAnalysis({
    selectedSlot,
    selectedAccountId,
    participants,
    stratzPlayers,
    openPlayers,
    heroConstants: entityConstants?.heroes,
    teamfights,
    selectedRepositions: events.repositions,
    durationSeconds: duration,
    catalog,
    scoreboardDeaths: summary.deaths.value,
  });
  // A death timeline needs a source that logs deaths; a zero on the scoreboard alone is not one.
  const deathTimes = deathAnalysis.timelineSource != null
    && completeDeathTimeline(deathAnalysis.contexts, summary.deaths.value, durationField.value)
    ? deathAnalysis.contexts.map((context) => context.time) : null;
  const inventory = finalInventoryFor(openPlayer, stratzPlayer, warnings, catalog);
  const phases = buildPhases(aligned.player ?? {}, stratzPlayer, duration, {
    clockOnly: modeClass === 'turbo' || modeClass === 'non_standard',
    openEvents: {
      kills: openDotaKills({ openPlayers, selectedSlot, durationSeconds: duration }),
      deaths: deathTimes ? deathTimes.map((time) => ({ time })) : null,
    },
  });
  const openMatch = openDota?.status === 'ready' ? openDota.match : null;
  const matchContextInput = { match: openMatch, selectedOpenPlayer: openPlayer, selectedSide: side.value, durationSeconds: duration };
  const heroId = field('Hero ID', openPlayer?.hero_id, stratzPlayer?.heroId);
  const players = buildPlayersTable({
    participants, openPlayers, stratzPlayerFor: (row) => stratzPlayerForParticipant(stratzPlayers, row),
    itemConstants: entityConstants?.items, catalog, durationSeconds: duration,
  });
  const abandons = abandonsFrom(players);
  for (const row of abandons) {
    warnings.push(`${row.hero?.name ?? 'A player'} (${row.side ?? 'unknown side'}) abandoned the match; the teams were uneven for part of it, so team totals, swings and comparisons are distorted.`);
  }
  const player = {
    accountId: sourced(selectedAccountId, openPlayer?.account_id != null ? 'opendota' : 'stratz'),
    slot: selectedSlot,
    heroId,
    heroName: sourced(entityRef(catalog, 'hero', heroId.value).name, valveNames.heroes[heroId.value] ? 'valve_datafeed' : 'opendota_constants'),
    side,
    position,
    lane: sourced(lane.selectedLane ?? selected.lane ?? null, lane.laneSource ?? selected.laneSource ?? null),
    isRoaming: sourced(selected.isRoaming, 'opendota'),
    rank: playerRankFor(openPlayer, stratzPlayer, warnings),
    kills: summary.kills,
    deaths: summary.deaths,
    assists: summary.assists,
    result,
  };
  const model = {
    schemaVersion: SCHEMA_VERSION,
    request: { matchId, accountId: selectedAccountId, slot: selectedSlot },
    generatedAt: generatedAt ?? null,
    sources: {
      opendota: sourceSummary(openDota),
      stratz: sourceSummary(stratz),
      valve: sourceSummary(valve),
      entityConstants: sourceSummary(entityConstants),
    },
    match: {
      result,
      durationSeconds: durationField,
      startTime: field('Start time', openDota?.match?.start_time, stratz?.match?.startDateTime),
      averageRank: rankField(stratz?.match?.rank),
      gameMode,
      lobbyType,
      modeClass,
      abandons,
    },
    player,
    participants,
    players,
    draft: draft.draft,
    lane: laneWithOutcome(lane, stratz, side.value),
    deathAnalysis,
    summary,
    items: { purchases: purchasesFor(openPlayer, stratzPlayer, duration, catalog, entityConstants), ...inventory },
    events,
    series: {
      gold: arraySeries(aligned.player?.gold_t, aligned.basis.gold_t),
      xp: arraySeries(aligned.player?.xp_t, aligned.basis.xp_t),
      lh: arraySeries(aligned.player?.lh_t, aligned.basis.lh_t),
      denies: arraySeries(aligned.player?.dn_t, aligned.basis.dn_t),
      netWorth: arraySeries(aligned.player?.networth_t, aligned.basis.networth_t),
    },
    patch: {
      match: sourced(valve?.matchPatch, 'valve'),
      current: sourced(valve?.currentPatch, 'valve'),
      isCurrentExactPatch: sourced(valve?.status === 'ready' ? valve.isCurrentExactPatch : null, 'valve'),
    },
    phases,
    teamEconomy: buildTeamEconomy({ match: openMatch, side: side.value, durationSeconds: duration, phases }),
    objectives: buildObjectives({
      match: openMatch, participants, selectedAccountId, selectedSlot, selectedSide: side.value,
      heroConstants: entityConstants?.heroes, durationSeconds: duration,
    }),
    wards: buildWards(matchContextInput),
    buybacks: buildBuybacks(matchContextInput),
    skillBuild: buildSkillBuild({ selectedOpenPlayer: openPlayer, catalog }),
    percentiles: buildPercentiles(openPlayer, modeClass),
    baseline: (modeClass === 'turbo' || modeClass === 'non_standard') && baseline?.status === 'ready'
      ? buildBaseline({ baseline: { status: 'unavailable', reason: 'non_standard_mode' } })
      : buildBaseline({
        baseline,
        openPlayer: aligned.player,
        events,
        duration,
        patch: valve?.currentPatch ?? null,
        rankCode: player.rank.value ?? stratz?.match?.rank ?? null,
        position: position?.value ?? null,
        deathTimes: !heroId.candidates && !side.candidates ? deathTimes : null,
      }),
    mechanics: buildMechanics(mechanics, { catalog }),
    eventInventory: eventInventory(events),
    warnings,
  };
  model.dataQuality = qualityFromCapabilities(computeCapabilities(model), warnings);
  return model;
}

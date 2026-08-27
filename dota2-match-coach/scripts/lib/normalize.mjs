import { rankLabel } from './rank.mjs';
import { bracketLabelFor, positionEnumFor } from './baseline.mjs';
import { GAME_MODES, LOBBY_TYPES, resolveVocabularyField } from './vocabulary.mjs';

const SCHEMA_VERSION = '1.1.0';
const PHASES = [
  { id: 'lane', start: 0, end: 600 },
  { id: 'transition', start: 600, end: 900 },
  { id: 'midgame', start: 900, end: 1500 },
  { id: 'closing', start: 1500, end: Infinity },
];

const SERIES_METRICS = [
  ['gold', 'gold_t', 'goldPerMin'],
  ['xp', 'xp_t', 'xpPerMin'],
  ['lh', 'lh_t', 'lhPerMin'],
  ['denies', 'dn_t', 'deniesPerMin'],
  ['heroDamage', 'hero_damage_t', 'heroDamagePerMin'],
];
const EVENT_METRICS = [['kills', 'killEvents'], ['deaths', 'deathEvents'], ['assists', 'assistEvents']];
// Сопоставимые ряды: слева минутный ряд игрока, справа метрика выборки STRATZ.
// Ряда net worth здесь нет намеренно. OpenDota `gold_t` — накопленное золото, а не
// net worth: в матче 8963443105 последняя точка ряда равна 12 772 при `net_worth`
// 11 150, то есть прокси систематически завышал игрока против baseline `networth`.
// Сопоставимого минутного ряда net worth ни один источник runtime не отдаёт, поэтому
// строка убрана, а не оставлена с оговоркой. Флаг `crossSourceProxy` остаётся в схеме
// для будущих рядов и сейчас не выставлен ни одной строкой.
const BASELINE_COMPARISONS = [
  { metric: 'lastHits', playerSeries: 'lh_t', baselineMetric: 'cs', crossSourceProxy: false },
  { metric: 'denies', playerSeries: 'dn_t', baselineMetric: 'dn', crossSourceProxy: false },
  { metric: 'xp', playerSeries: 'xp_t', baselineMetric: 'xp', crossSourceProxy: false },
  { metric: 'heroDamage', playerSeries: 'hero_damage_t', baselineMetric: 'heroDamage', crossSourceProxy: false },
];
const BASELINE_MINUTES = [10, 15, 25];
const BASELINE_MAX_MINUTE = 75;
const BASELINE_MIN_SAMPLE = 200;

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

// Медаль самого игрока: OpenDota `rank_tier` и STRATZ `seasonRank` — оба снимка
// профиля, а не ранг на момент матча. Расхождение между ними не разрешается в
// пользу одного источника: код остаётся неизвестным, и baseline падает на средний
// bracket матча, который заведомо шире.
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

function playersFor(result) {
  return result?.status === 'ready' && Array.isArray(result.match?.players)
    ? result.match.players.filter((player) => player && typeof player === 'object')
    : [];
}

function byAccount(players, accountId, field) {
  return players.filter((player) => String(player[field]) === String(accountId));
}

function resolvePlayer(accountId, openDota, stratz) {
  const openMatches = byAccount(playersFor(openDota), accountId, 'account_id');
  const stratzMatches = byAccount(playersFor(stratz), accountId, 'steamAccountId');
  if (openMatches.length > 1 || stratzMatches.length > 1) {
    throw new NormalizationError('account_ambiguous', `Account ${accountId} appears more than once`);
  }
  if (openMatches.length + stratzMatches.length === 0) {
    throw new NormalizationError('account_not_found', `Account ${accountId} was not found in available match data`);
  }
  return { openPlayer: openMatches[0], stratzPlayer: stratzMatches[0] };
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

function seriesDelta(series, start, end) {
  const startSample = seriesSampleAt(series, start);
  const endSample = seriesSampleAt(series, end);
  if (startSample == null || endSample == null || endSample.index * 60 < start) return null;
  return endSample.value - startSample.value;
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
  for (const metric of EXTREMA_METRICS) {
    const available = phases.filter((phase) => finiteNumber(phase.metrics[metric]));
    if (available.length === 0) continue;
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

export function buildPhases(player = {}, stratzPlayer, durationSeconds) {
  const duration = finiteNumber(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const playback = stratzPlayer?.playbackData ?? {};
  const phases = PHASES
    .map((definition) => ({ ...definition, end: Math.min(definition.end, duration) }))
    .filter((definition) => definition.start < definition.end)
    .map(({ id, start, end }) => {
      const minutes = (end - start) / 60;
      const metrics = {};
      for (const [metric, seriesKey, rateMetric] of SERIES_METRICS) {
        const delta = seriesDelta(player?.[seriesKey], start, end);
        metrics[metric] = delta;
        metrics[rateMetric] = delta == null ? null : delta / minutes;
      }
      for (const [metric, eventKey] of EVENT_METRICS) metrics[metric] = countEvents(playback[eventKey], start, end);
      return { id, start, end, interval: intervalLabel(start, end), metrics, extremaWithinMatch: [] };
    });
  return addExtrema(phases);
}

function draftCandidate(source, radiantIds, direIds) {
  const radiant = [...new Set(radiantIds.filter(finiteNumber))];
  const dire = [...new Set(direIds.filter(finiteNumber))];
  const complete = radiant.length === 5 && dire.length === 5 && new Set([...radiant, ...dire]).size === 10;
  return { source, radiant, dire, complete };
}

function draftFor(openDota, stratz) {
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
  const radiant = selected.radiant.map((heroId) => sourced(heroId, selected.source));
  const dire = selected.dire.map((heroId) => sourced(heroId, selected.source));
  const draft = { radiant, dire, picks: [...radiant, ...dire], complete: selected.complete };
  if (new Set(signatures).size > 1) {
    draft.candidates = complete.map((candidate) => ({
      source: candidate.source,
      radiant: candidate.radiant.map((heroId) => sourced(heroId, candidate.source)),
      dire: candidate.dire.map((heroId) => sourced(heroId, candidate.source)),
    }));
  }
  return { draft, warnings };
}

function safeEvent(event, fields, source, duration, timeField = 'time') {
  if (!event || !finiteNumber(event[timeField]) || !finiteNumber(duration)
    || event[timeField] < 0 || event[timeField] > duration) return null;
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

function timedEvents(events, fields, duration) {
  return Array.isArray(events) ? events.map((event) => safeEvent(event, fields, 'stratz', duration)).filter(Boolean) : [];
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
    kills: timedEvents(playback.killEvents, ['target', 'byAbility', 'byItem', 'positionX', 'positionY', 'isGank', 'isSmoke'], duration),
    deaths: timedEvents(playback.deathEvents, ['attacker', 'byAbility', 'byItem', 'positionX', 'positionY', 'timeDead', 'isFeed'], duration),
    assists: timedEvents(playback.assistEvents, ['target', 'positionX', 'positionY'], duration),
    cs: timedEvents(playback.csEvents, ['npcId', 'byAbility', 'byItem', 'gold', 'xp', 'positionX', 'positionY', 'isCreep', 'isNeutral', 'isAncient'], duration),
    purchases: timedEvents(playback.purchaseEvents, ['itemId'], duration),
    runes: timedEvents(playback.runeEvents, ['rune', 'action', 'gold', 'positionX', 'positionY'], duration),
    abilityUses: timedEvents(playback.abilityUsedEvents, ['abilityId'], duration),
    itemUses: timedEvents(playback.itemUsedEvents, ['itemId'], duration),
    positions: timedEvents(playback.playerUpdatePositionEvents, ['x', 'y'], duration),
    teamfights,
    objectives: [],
  };
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
  };
}

function arraySeries(values) {
  return { values: Array.isArray(values) ? values.map((value) => finiteNumber(value) ? value : null) : [], source: Array.isArray(values) ? 'opendota' : null };
}

function laneOutcomeFor(stratzPlayer, stratz) {
  const lane = String(stratzPlayer?.lane ?? '').toLowerCase();
  if (lane.includes('top')) return stratz?.match?.topLaneOutcome;
  if (lane.includes('mid')) return stratz?.match?.midLaneOutcome;
  if (lane.includes('bottom') || lane.includes('bot')) return stratz?.match?.bottomLaneOutcome;
  return null;
}

function finalInventoryFor(openPlayer, stratzPlayer, warnings) {
  const openItems = Array.from({ length: 6 }, (_, index) => openPlayer?.[`item_${index}`]).filter(finiteNumber);
  const stratzItems = Array.from({ length: 6 }, (_, index) => stratzPlayer?.[`item${index}Id`]).filter(finiteNumber);
  const conflict = openItems.length > 0 && stratzItems.length > 0 && !sameValue(openItems, stratzItems);
  if (conflict) warnings.push('Final inventory conflict between opendota and stratz.');
  const values = openItems.length > 0 ? openItems : stratzItems;
  const source = openItems.length > 0 ? 'opendota' : 'stratz';
  const result = { finalInventory: values.map((value) => sourced(value, source)) };
  if (conflict) {
    result.finalInventoryCandidates = [
      { source: 'opendota', items: openItems.map((value) => sourced(value, 'opendota')) },
      { source: 'stratz', items: stratzItems.map((value) => sourced(value, 'stratz')) },
    ];
  }
  return result;
}

function purchasesFor(openPlayer, stratzPlayer, duration) {
  const inMatch = (time) => finiteNumber(duration) && finiteNumber(time) && time >= 0 && time <= duration;
  const open = Array.isArray(openPlayer?.purchase_log) ? openPlayer.purchase_log
    .filter((entry) => inMatch(entry?.time) && (typeof entry?.key === 'string' || finiteNumber(entry?.item_id)))
    .map((entry) => ({ time: entry.time, item: entry.key ?? entry.item_id, source: 'opendota' })) : [];
  const stratz = Array.isArray(stratzPlayer?.playbackData?.purchaseEvents)
    ? stratzPlayer.playbackData.purchaseEvents
      .filter((event) => inMatch(event?.time) && finiteNumber(event?.itemId))
      .map((event) => ({ time: event.time, item: event.itemId, source: 'stratz' }))
    : [];
  return [...open, ...stratz]
    .sort((left, right) => left.time - right.time || left.source.localeCompare(right.source));
}


function baselineMinutes(duration) {
  const final = finiteNumber(duration) ? Math.floor(duration / 60) : null;
  const minutes = [...BASELINE_MINUTES, final]
    .filter((minute) => Number.isInteger(minute) && minute >= 1 && minute <= BASELINE_MAX_MINUTE)
    .filter((minute) => !finiteNumber(duration) || minute * 60 <= duration);
  return [...new Set(minutes)].sort((left, right) => left - right);
}

function cumulativeDeathsAt(events, minute) {
  const deaths = Array.isArray(events?.deaths) ? events.deaths.filter((death) => finiteNumber(death?.time)) : [];
  return deaths.length === 0 ? null : deaths.filter((death) => death.time <= minute * 60).length;
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

export function buildBaseline({ baseline, openPlayer, events, duration, patch, rankCode, position }) {
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
    points.push(point);
    for (const spec of BASELINE_COMPARISONS) {
      const sample = seriesSampleAt(openPlayer?.[spec.playerSeries], minute * 60);
      const baselineValue = point[spec.baselineMetric];
      if (!sample || sample.index !== minute || !finiteNumber(baselineValue)) continue;
      comparisons.push(comparisonRow({
        metric: spec.metric, minute, playerValue: sample.value, baselineValue,
        matchCount: point.matchCount, crossSourceProxy: spec.crossSourceProxy,
      }));
    }
    const playerDeaths = cumulativeDeathsAt(events, minute);
    if (playerDeaths != null && finiteNumber(point.deaths)) {
      comparisons.push(comparisonRow({
        metric: 'deaths', minute, playerValue: playerDeaths, baselineValue: point.deaths,
        matchCount: point.matchCount, crossSourceProxy: false,
      }));
    }
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

export function dataQualityFor(model) {
  const events = model.events ?? {};
  const hasTimed = (name, field = 'time') => Array.isArray(events[name]) && events[name].some((event) => finiteNumber(event?.[field]));
  const gates = {
    scoreboard: Boolean(model.player?.accountId?.value != null && model.match?.durationSeconds?.value != null),
    phase_aggregates: Boolean(model.phases?.some((phase) => ['gold', 'xp', 'lh'].some((metric) => phase.metrics?.[metric] != null))
      || Object.keys(events).some((name) => hasTimed(name, name === 'teamfights' ? 'start' : 'time'))),
    draft_ready: Boolean(model.draft?.complete && model.draft?.radiant?.length === 5 && model.draft?.dire?.length === 5),
    event_ready: Boolean(hasTimed('deaths') && (hasTimed('positions') || hasTimed('teamfights', 'start') || hasTimed('runes') || hasTimed('abilityUses'))),
    baseline_ready: Boolean(model.baseline?.sameHeroPositionRankPatch?.points?.length > 0
      && model.baseline?.comparisons?.length > 0),
    current_patch: Boolean(model.patch?.isCurrentExactPatch?.value === true),
  };
  const missing = [];
  if (!gates.scoreboard) missing.push('scoreboard');
  if (!gates.phase_aggregates) missing.push('phase aggregates');
  if (!gates.draft_ready) missing.push('complete draft');
  if (!gates.event_ready) missing.push('event timeline');
  if (!gates.baseline_ready) missing.push('baseline comparison');
  if (!gates.current_patch) missing.push('current exact patch');
  return {
    mode: gates.scoreboard && gates.draft_ready && gates.event_ready && gates.current_patch ? 'full' : 'degraded',
    gates,
    missing,
    warnings: [...(model.warnings ?? [])],
  };
}

export function normalizeEvidence({ matchId, accountId, openDota, stratz, valve, baseline, generatedAt } = {}) {
  const { openPlayer, stratzPlayer } = resolvePlayer(accountId, openDota, stratz);
  const warnings = [];
  const field = (label, openValue, stratzValue) => resolvedField(label, [
    { value: openValue, source: 'opendota' },
    { value: stratzValue, source: 'stratz' },
  ], warnings);
  // Режим и тип лобби приходят разными словарями, поэтому идут не через `field`.
  const vocabulary = (label, table, openValue, stratzValue) => {
    const resolved = resolveVocabularyField(label, table, { opendota: openValue, stratz: stratzValue });
    warnings.push(...resolved.warnings);
    return resolved.field;
  };
  const durationField = field('Duration', openDota?.match?.duration, stratz?.match?.durationSeconds);
  const duration = durationField.value ?? openDota?.match?.duration ?? stratz?.match?.durationSeconds;
  const position = positionFor(openPlayer, stratzPlayer, warnings);
  const side = sideFor(openPlayer, stratzPlayer, warnings);
  const result = resolvedField('Result', resultCandidates(openPlayer, stratzPlayer, openDota, stratz), warnings);
  const draft = draftFor(openDota, stratz);
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
  const inventory = finalInventoryFor(openPlayer, stratzPlayer, warnings);
  const player = {
    accountId: sourced(accountId, openPlayer ? 'opendota' : 'stratz'),
    heroId: field('Hero ID', openPlayer?.hero_id, stratzPlayer?.heroId),
    side,
    position,
    lane: sourced(stratzPlayer?.lane, 'stratz'),
    rank: playerRankFor(openPlayer, stratzPlayer, warnings),
    kills: summary.kills,
    deaths: summary.deaths,
    assists: summary.assists,
    result,
  };
  const model = {
    schemaVersion: SCHEMA_VERSION,
    request: { matchId, accountId },
    generatedAt: generatedAt ?? null,
    sources: { opendota: sourceSummary(openDota), stratz: sourceSummary(stratz), valve: sourceSummary(valve) },
    match: {
      result,
      durationSeconds: durationField,
      startTime: field('Start time', openDota?.match?.start_time, stratz?.match?.startDateTime),
      averageRank: rankField(stratz?.match?.rank),
      gameMode: vocabulary('Game mode', GAME_MODES, openDota?.match?.game_mode, stratz?.match?.gameMode),
      lobbyType: vocabulary('Lobby type', LOBBY_TYPES, openDota?.match?.lobby_type, stratz?.match?.lobbyType),
    },
    player,
    draft: draft.draft,
    lane: {
      opponentHeroIds: side.value === 'radiant' ? draft.draft.dire : side.value === 'dire' ? draft.draft.radiant : [],
      outcome: sourced(laneOutcomeFor(stratzPlayer, stratz), 'stratz'),
      efficiency: sourced(null, null),
    },
    summary,
    items: { purchases: purchasesFor(openPlayer, stratzPlayer, duration), ...inventory },
    events,
    series: {
      gold: arraySeries(openPlayer?.gold_t),
      xp: arraySeries(openPlayer?.xp_t),
      lh: arraySeries(openPlayer?.lh_t),
      denies: arraySeries(openPlayer?.dn_t),
    },
    patch: {
      match: sourced(valve?.matchPatch, 'valve'),
      current: sourced(valve?.currentPatch, 'valve'),
      isCurrentExactPatch: sourced(valve?.status === 'ready' ? valve.isCurrentExactPatch : null, 'valve'),
    },
    phases: buildPhases(openPlayer ?? {}, stratzPlayer, duration),
    baseline: buildBaseline({
      baseline,
      openPlayer,
      events,
      duration,
      patch: valve?.currentPatch ?? null,
      rankCode: player.rank.value ?? stratz?.match?.rank ?? null,
      position: position?.value ?? null,
    }),
    eventInventory: eventInventory(events),
    warnings,
  };
  model.dataQuality = dataQualityFor(model);
  return model;
}

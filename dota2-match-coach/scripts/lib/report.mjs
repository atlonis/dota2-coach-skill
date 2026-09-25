import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function valueOf(field) {
  if (field == null) return '—';
  if (typeof field === 'object' && 'value' in field) {
    return field.value == null ? '—' : String(field.value);
  }
  return String(field);
}

function sourceOf(field) {
  return field?.source == null ? '—' : String(field.source);
}

function list(values) {
  return Array.isArray(values) && values.length > 0 ? values.map(String).join(', ') : '—';
}

function table(rows) {
  return ['| Field | Value |', '| --- | --- |', ...rows.map(([name, value]) => `| ${name} | ${value} |`)].join('\n');
}

function sourceRows(sources = {}) {
  return Object.keys(sources).sort().map((name) => {
    const source = sources[name] ?? {};
    const details = [source.reason, source.error?.code, source.parse?.state].filter((value) => value != null).join('; ');
    return [name, `${source.status ?? 'unavailable'}${details ? ` (${details})` : ''}`];
  });
}

function phaseRows(phases = []) {
  return phases.map((phase) => {
    const metrics = Object.entries(phase.metrics ?? {})
      .filter(([, value]) => value != null)
      .map(([name, value]) => `${name}: ${value}`)
      .join('; ') || '—';
    return `| ${phase.id ?? '—'} | ${phase.interval ?? '—'} | ${metrics} | ${list(phase.extremaWithinMatch)} |`;
  });
}

function scalar(value) {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value) ? value : undefined;
}

function scalarField(object, field) {
  const value = scalar(object?.[field]);
  return Object.hasOwn(object ?? {}, field) && value !== undefined ? [field, value] : null;
}

function pickScalars(object, fields) {
  return Object.fromEntries(fields.map((field) => scalarField(object, field)).filter(Boolean));
}

function pickStrings(object, fields) {
  return Object.fromEntries(fields
    .filter((field) => typeof object?.[field] === 'string')
    .map((field) => [field, object[field]]));
}

function pickNumbers(object, fields, { nullable = false } = {}) {
  return Object.fromEntries(fields
    .filter((field) => Number.isFinite(object?.[field]) || (nullable && object?.[field] === null))
    .map((field) => [field, object[field]]));
}

function pickBooleans(object, fields) {
  return Object.fromEntries(fields
    .filter((field) => typeof object?.[field] === 'boolean')
    .map((field) => [field, object[field]]));
}

function stringArray(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string') : undefined;
}

// A field with a human-readable label: rank, game mode, lobby type. An unresolved
// field prints its candidates, so an incomparable vocabulary does not look like
// missing data.
function labelledCell(field, unknown = 'label unknown') {
  const value = valueOf(field);
  if (field?.value == null) {
    const candidates = Array.isArray(field?.candidates) ? field.candidates : [];
    return candidates.length > 0
      ? `${value} (candidates: ${candidates.map((candidate) => `${valueOf(candidate)} (${sourceOf(candidate)})`).join(', ')})`
      : value;
  }
  return field.label ? `${value} — ${field.label}` : `${value} — ${unknown}`;
}

function projectSourced(field) {
  const projected = pickScalars(field, ['value', 'label', 'source']);
  if (Array.isArray(field?.candidates)) {
    projected.candidates = field.candidates
      .map((candidate) => pickScalars(candidate, ['value', 'source']))
      .filter((candidate) => Object.hasOwn(candidate, 'value') && Object.hasOwn(candidate, 'source'));
  }
  return projected;
}

const BASELINE_POINT_FIELDS = ['minute', 'matchCount', 'networth', 'cs', 'dn', 'xp', 'level', 'kills', 'deaths', 'assists', 'heroDamage'];

function projectBaseline(baseline) {
  const sample = baseline?.sameHeroPositionRankPatch ?? null;
  const projected = {
    status: typeof baseline?.status === 'string' ? baseline.status : 'unavailable',
    reason: typeof baseline?.reason === 'string' ? baseline.reason : null,
    sameHeroPositionRankPatch: sample === null ? null : {
      ...pickNumbers(sample, ['heroId', 'rankCode'], { nullable: true }),
      ...pickStrings(sample, ['position', 'bracket', 'bracketLabel', 'bracketSource', 'patch', 'statistic', 'source']),
      weeks: Array.isArray(sample.weeks) ? sample.weeks.filter(Number.isInteger) : [],
      points: Array.isArray(sample.points)
        ? sample.points.map((point) => ({
          ...pickNumbers(point, BASELINE_POINT_FIELDS, { nullable: true }),
          ...(point.metricSampleSizes && typeof point.metricSampleSizes === 'object'
            ? { metricSampleSizes: pickNumbers(point.metricSampleSizes, BASELINE_POINT_FIELDS.slice(2), { nullable: true }) }
            : {}),
        }))
        : [],
    },
    comparisons: Array.isArray(baseline?.comparisons)
      ? baseline.comparisons.map((row) => ({
        ...pickStrings(row, ['metric', 'source']),
        ...pickNumbers(row, ['minute', 'player', 'baseline', 'delta', 'ratio', 'matchCount'], { nullable: true }),
        ...pickBooleans(row, ['crossSourceProxy']),
      }))
      : [],
  };
  if (typeof baseline?.error?.code === 'string') projected.error = { code: baseline.error.code };
  return projected;
}

function projectProgress(progress) {
  return {
    ...pickScalars(progress, ['status', 'reason']),
    ...pickNumbers(progress, ['eligibleMatchCount', 'excludedMatchCount', 'minimumPriorMatches']),
    comparisons: Array.isArray(progress.comparisons) ? progress.comparisons.map((row) => ({
      ...pickStrings(row, ['metric', 'source']),
      ...pickNumbers(row, ['minute', 'current', 'mean', 'delta', 'matchCount'], { nullable: true }),
    })) : [],
    deathObservations: Array.isArray(progress.deathObservations) ? progress.deathObservations.map((row) => ({
      ...pickStrings(row, ['observation']),
      ...pickNumbers(row, ['currentCount', 'currentDeaths', 'priorCount', 'priorDeaths', 'priorMatchCount', 'priorMatchesWithObservation', 'currentShare', 'priorMeanShare'], { nullable: true }),
    })) : [],
    history: Array.isArray(progress.history) ? progress.history.map((row) => pickNumbers(row, ['matchId', 'startTime'])) : [],
    limitations: stringArray(progress.limitations) ?? [],
    ...(progress.historyLoad ? { historyLoad: {
      ...pickScalars(progress.historyLoad, ['status', 'reason']),
      ...pickNumbers(progress.historyLoad, ['skippedFileCount']),
      ...pickBooleans(progress.historyLoad, ['truncated']),
    } } : {}),
  };
}

function projectSource(source) {
  const projected = pickScalars(source, ['status', 'reason', 'matchPatch', 'currentPatch', 'isCurrentExactPatch']);
  if (source?.error && typeof source.error.code === 'string') projected.error = { code: source.error.code };
  if (source?.parse && typeof source.parse === 'object') projected.parse = pickScalars(source.parse, ['requested', 'state']);
  return projected;
}

function projectSeries(series) {
  const projected = pickScalars(series, ['source', 'minuteBasis']);
  projected.values = Array.isArray(series?.values)
    ? series.values.filter((value) => value === null || Number.isFinite(value))
    : [];
  return projected;
}

function projectEntityRef(value) {
  return {
    id: Number.isSafeInteger(value?.id) ? value.id : null,
    name: typeof value?.name === 'string' && value.name.trim() ? value.name : null,
  };
}

function projectSourcedEntity(field) {
  const projected = { value: projectEntityRef(field?.value) };
  if (typeof field?.source === 'string') projected.source = field.source;
  else if (field?.source === null) projected.source = null;
  return projected;
}

function projectParticipant(participant, fallbackSlot) {
  return {
    slot: Number.isSafeInteger(participant?.slot) ? participant.slot : fallbackSlot,
    accountId: Number.isSafeInteger(participant?.accountId) ? participant.accountId : null,
    hero: projectEntityRef(participant?.hero),
    side: typeof participant?.side === 'string' ? participant.side : null,
    position: scalar(participant?.position) ?? null,
    lane: typeof participant?.lane === 'string' ? participant.lane : null,
    role: typeof participant?.role === 'string' ? participant.role : null,
    rank: scalar(participant?.rank) ?? null,
    playbackAvailable: typeof participant?.playbackAvailable === 'boolean' ? participant.playbackAvailable : null,
    sourceConflict: typeof participant?.sourceConflict === 'boolean' ? participant.sourceConflict : null,
  };
}

function projectPosition(position) {
  if (!position || typeof position !== 'object') return null;
  return pickNumbers(position, ['time', 'x', 'y', 'ageSeconds'], { nullable: true });
}

function projectParticipantContext(row) {
  return {
    participant: projectParticipant(row?.participant, null),
    position: projectPosition(row?.position),
    distance: Number.isFinite(row?.distance) ? row.distance : null,
    positionAgeSeconds: Number.isFinite(row?.positionAgeSeconds) ? row.positionAgeSeconds : null,
  };
}

function projectDeathEvent(event, kind) {
  const projected = pickNumbers(event, ['time']);
  if (kind === 'ability') projected.ability = projectEntityRef(event?.ability);
  if (kind === 'item') projected.item = projectEntityRef(event?.item);
  return projected;
}

function projectDeathContext(context) {
  const recentReposition = context?.recentReposition;
  return {
    time: Number.isFinite(context?.time) ? context.time : null,
    position: projectPosition(context?.position),
    killerHero: projectEntityRef(context?.killerHero),
    killingAbility: projectEntityRef(context?.killingAbility),
    killingItem: projectEntityRef(context?.killingItem),
    timeDead: Number.isFinite(context?.timeDead) ? context.timeDead : null,
    teamfight: {
      inFight: typeof context?.teamfight?.inFight === 'boolean' ? context.teamfight.inFight : null,
      start: Number.isFinite(context?.teamfight?.start) ? context.teamfight.start : null,
      end: Number.isFinite(context?.teamfight?.end) ? context.teamfight.end : null,
    },
    nearbyAllies: Array.isArray(context?.nearbyAllies) ? context.nearbyAllies.map(projectParticipantContext) : [],
    nearbyEnemies: Array.isArray(context?.nearbyEnemies) ? context.nearbyEnemies.map(projectParticipantContext) : [],
    ownAbilityUses: Array.isArray(context?.ownAbilityUses) ? context.ownAbilityUses.map((event) => projectDeathEvent(event, 'ability')) : [],
    ownItemUses: Array.isArray(context?.ownItemUses) ? context.ownItemUses.map((event) => projectDeathEvent(event, 'item')) : [],
    recentReposition: recentReposition == null ? null : {
      ...pickScalars(recentReposition, ['time', 'fromX', 'fromY', 'x', 'y', 'cause', 'causeTime', 'source']),
      causeItem: projectEntityRef(recentReposition.causeItem),
      causeAbility: projectEntityRef(recentReposition.causeAbility),
    },
    nearbyDeaths: Array.isArray(context?.nearbyDeaths) ? context.nearbyDeaths.map((row) => ({
      time: Number.isFinite(row?.time) ? row.time : null,
      participant: projectParticipant(row?.participant, null),
      position: projectPosition(row?.position),
      distance: Number.isFinite(row?.distance) ? row.distance : null,
    })) : [],
    nearbyKills: Array.isArray(context?.nearbyKills) ? context.nearbyKills.map((row) => ({
      time: Number.isFinite(row?.time) ? row.time : null,
      participant: projectParticipant(row?.participant, null),
      position: projectPosition(row?.position),
      distance: Number.isFinite(row?.distance) ? row.distance : null,
    })) : [],
    observations: pickScalars(context?.observations, [
      'isolated', 'afterConfirmedTeleport', 'firstAlliedDeathInFight', 'tradedLocally', 'ownDefensiveItemUsed', 'contextIncomplete',
    ]),
    unavailable: stringArray(context?.unavailable) ?? [],
  };
}

const SIDES = new Set(['radiant', 'dire']);
const TEAM_MEASURES = ['earnedGold', 'xp', 'netWorth'];
const OBJECTIVE_TYPES = new Set([
  'building_destroyed', 'roshan_killed', 'tormentor_killed', 'aegis_picked_up', 'aegis_stolen', 'aegis_denied', 'first_blood', 'courier_lost',
]);

function booleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function sideOrNull(value) {
  return SIDES.has(value) ? value : null;
}

function sectionHeader(section, sources) {
  return {
    status: typeof section?.status === 'string' ? section.status : 'unavailable',
    reason: typeof section?.reason === 'string' ? section.reason : null,
    source: sources.includes(section?.source) ? section.source : null,
  };
}

function minuteValues(values) {
  return Array.isArray(values) ? values.map((value) => (Number.isFinite(value) ? value : null)) : [];
}

function projectMinutePoint(point) {
  return point && typeof point === 'object' ? pickNumbers(point, ['minute', 'value']) : null;
}

function projectSwing(swing) {
  return swing && typeof swing === 'object'
    ? pickNumbers(swing, ['startMinute', 'endMinute', 'start', 'end', 'change'], { nullable: true })
    : null;
}

function projectTeamEconomy(economy) {
  const measures = TEAM_MEASURES.filter((name) => Array.isArray(economy?.measures?.[name]?.values));
  const perMeasure = (build) => Object.fromEntries(measures.map((name) => [name, build(name)]));
  return {
    ...sectionHeader(economy, ['opendota']),
    perspective: sideOrNull(economy?.perspective),
    swingWindowMinutes: Number.isInteger(economy?.swingWindowMinutes) ? economy.swingWindowMinutes : null,
    measures: perMeasure((name) => ({ values: minuteValues(economy.measures[name].values) })),
    phases: Array.isArray(economy?.phases) ? economy.phases.map((phase) => ({
      ...pickStrings(phase, ['id', 'interval']),
      ...pickNumbers(phase, ['start', 'end']),
      ...Object.fromEntries(measures.filter((name) => phase?.[name] && typeof phase[name] === 'object')
        .map((name) => [name, pickNumbers(phase[name], ['startMinute', 'endMinute', 'start', 'end', 'change'], { nullable: true })])),
    })) : [],
    extremes: perMeasure((name) => ({
      maxLead: projectMinutePoint(economy?.extremes?.[name]?.maxLead),
      maxDeficit: projectMinutePoint(economy?.extremes?.[name]?.maxDeficit),
    })),
    leadChanges: perMeasure((name) => (Array.isArray(economy?.leadChanges?.[name]) ? economy.leadChanges[name] : [])
      .filter((row) => ['selected_side', 'opponent_side'].includes(row?.ahead))
      .map((row) => ({ ...pickNumbers(row, ['minute']), ahead: row.ahead }))),
    largestSwings: perMeasure((name) => ({
      adverse: projectSwing(economy?.largestSwings?.[name]?.adverse),
      favorable: projectSwing(economy?.largestSwings?.[name]?.favorable),
    })),
  };
}

function projectActor(actor) {
  if (!actor || typeof actor !== 'object') return null;
  return {
    ...(['hero', 'non_hero'].includes(actor.kind) ? { kind: actor.kind } : {}),
    hero: actor.hero && typeof actor.hero === 'object' ? projectEntityRef(actor.hero) : null,
    side: sideOrNull(actor.side),
    selectedPlayer: booleanOrNull(actor.selectedPlayer),
  };
}

function projectBuilding(building) {
  if (!building || typeof building !== 'object') return null;
  return {
    side: sideOrNull(building.side),
    kind: ['tower', 'barracks', 'ancient'].includes(building.kind) ? building.kind : null,
    tier: Number.isInteger(building.tier) ? building.tier : null,
    lane: ['top', 'mid', 'bottom'].includes(building.lane) ? building.lane : null,
    barracks: ['melee', 'ranged'].includes(building.barracks) ? building.barracks : null,
  };
}

function projectObjectiveEvent(event) {
  const projected = { ...pickNumbers(event, ['time']), type: event.type };
  if (event.type === 'building_destroyed') {
    return {
      ...projected, building: projectBuilding(event.building), killer: projectActor(event.killer),
      denied: booleanOrNull(event.denied), ownBuilding: booleanOrNull(event.ownBuilding),
    };
  }
  if (event.type === 'roshan_killed' || event.type === 'tormentor_killed') {
    return { ...projected, team: sideOrNull(event.team), bySelectedSide: booleanOrNull(event.bySelectedSide), participant: projectActor(event.participant) };
  }
  if (event.type === 'first_blood') return { ...projected, killer: projectActor(event.killer), victim: projectActor(event.victim) };
  if (event.type === 'courier_lost') {
    return { ...projected, lostBy: sideOrNull(event.lostBy), lostBySelectedSide: booleanOrNull(event.lostBySelectedSide), killer: projectActor(event.killer) };
  }
  return { ...projected, participant: projectActor(event.participant), bySelectedSide: booleanOrNull(event.bySelectedSide) };
}

function projectObjectives(objectives) {
  return {
    ...sectionHeader(objectives, ['opendota']),
    events: Array.isArray(objectives?.events)
      ? objectives.events.filter((event) => OBJECTIVE_TYPES.has(event?.type) && Number.isFinite(event?.time)).map(projectObjectiveEvent)
      : [],
    unrecognizedCount: Number.isInteger(objectives?.unrecognizedCount) ? objectives.unrecognizedCount : null,
  };
}

function projectWardCounts(counts) {
  return counts && typeof counts === 'object' ? pickNumbers(counts, ['observer', 'sentry']) : null;
}

function projectWards(wards) {
  const selected = wards?.selectedPlayer;
  return {
    ...sectionHeader(wards, ['opendota']),
    selectedPlayer: selected && typeof selected === 'object' ? {
      placements: Array.isArray(selected.placements) ? selected.placements
        .filter((placement) => ['observer', 'sentry'].includes(placement?.kind) && Number.isFinite(placement?.time))
        .map((placement) => ({
          ...pickNumbers(placement, ['time']), kind: placement.kind,
          ...pickNumbers(placement, ['endedAt', 'secondsActive'], { nullable: true }),
        })) : [],
      ...pickNumbers(selected, ['observerCount', 'sentryCount', 'excludedCount']),
    } : null,
    teams: wards?.teams && typeof wards.teams === 'object' ? {
      selectedSide: projectWardCounts(wards.teams.selectedSide),
      opponentSide: projectWardCounts(wards.teams.opponentSide),
    } : null,
  };
}

function projectBuybacks(buybacks) {
  return {
    ...sectionHeader(buybacks, ['opendota']),
    selectedPlayer: Array.isArray(buybacks?.selectedPlayer)
      ? buybacks.selectedPlayer.filter((row) => Number.isFinite(row?.time)).map((row) => ({ time: row.time }))
      : [],
    ...pickNumbers(buybacks, ['selectedSideCount', 'opponentSideCount'], { nullable: true }),
  };
}

function projectSkillBuild(skillBuild) {
  return {
    ...sectionHeader(skillBuild, ['opendota']),
    upgrades: Array.isArray(skillBuild?.upgrades) ? skillBuild.upgrades
      .filter((row) => Number.isInteger(row?.order))
      .map((row) => ({ order: row.order, ability: projectEntityRef(row.ability) })) : [],
  };
}

const MAX_TEXT_LENGTH = 2000;

function boundedText(value) {
  return typeof value === 'string' && value.trim() && value.length <= MAX_TEXT_LENGTH ? value : null;
}

function numberArray(values) {
  return Array.isArray(values) ? values.filter(Number.isFinite) : [];
}

function projectListedValues(values) {
  return (Array.isArray(values) ? values : [])
    .filter((row) => boundedText(row?.label) && boundedText(row?.value))
    .map((row) => ({ label: row.label, value: row.value }));
}

function projectAbilityMechanics(row, full) {
  return {
    ability: projectEntityRef(row?.ability),
    kind: ['basic', 'ultimate', 'innate'].includes(row?.kind) ? row.kind : null,
    grantedBy: ['scepter', 'shard'].includes(row?.grantedBy) ? row.grantedBy : null,
    description: boundedText(row?.description),
    cooldowns: numberArray(row?.cooldowns),
    manaCosts: numberArray(row?.manaCosts),
    castRanges: numberArray(row?.castRanges),
    scepter: boundedText(row?.scepter),
    shard: boundedText(row?.shard),
    ...(full ? { maxLevel: Number.isInteger(row?.maxLevel) ? row.maxLevel : null, values: projectListedValues(row?.values) } : {}),
  };
}

function projectAttribute(attribute) {
  return attribute && typeof attribute === 'object' ? pickNumbers(attribute, ['base', 'gain'], { nullable: true }) : null;
}

function heroTraits(hero) {
  return {
    primaryAttribute: ['strength', 'agility', 'intelligence', 'universal'].includes(hero?.primaryAttribute) ? hero.primaryAttribute : null,
    attackType: ['melee', 'ranged'].includes(hero?.attackType) ? hero.attackType : null,
  };
}

function projectPatchNoteRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => boundedText(row?.text))
    .map((row) => ({ text: row.text, level: Number.isInteger(row.level) ? row.level : 1 }));
}

function projectPatchNotes(notes) {
  if (!notes || typeof notes !== 'object') return null;
  return {
    status: notes.status === 'ready' ? 'ready' : 'unavailable',
    version: boundedText(notes.version),
    general: (Array.isArray(notes.general) ? notes.general : []).map((section) => ({
      title: boundedText(section?.title), notes: projectPatchNoteRows(section?.notes),
    })),
    generalTruncated: notes.generalTruncated === true,
    heroes: (Array.isArray(notes.heroes) ? notes.heroes : []).map((entry) => ({
      hero: projectEntityRef(entry?.hero),
      notes: projectPatchNoteRows(entry?.notes),
      talentNotes: projectPatchNoteRows(entry?.talentNotes),
      abilities: (Array.isArray(entry?.abilities) ? entry.abilities : []).map((ability) => ({
        ability: projectEntityRef(ability?.ability), notes: projectPatchNoteRows(ability?.notes),
      })),
    })),
    items: (Array.isArray(notes.items) ? notes.items : []).map((entry) => ({
      item: projectEntityRef(entry?.item), notes: projectPatchNoteRows(entry?.notes),
    })),
  };
}

function projectMechanics(mechanics) {
  const selected = mechanics?.selectedHero;
  return {
    status: ['ready', 'partial', 'unavailable'].includes(mechanics?.status) ? mechanics.status : 'unavailable',
    reason: typeof mechanics?.reason === 'string' ? mechanics.reason : null,
    source: mechanics?.source === 'valve_datafeed' ? 'valve_datafeed' : null,
    patch: boundedText(mechanics?.patch),
    selectedHero: selected && typeof selected === 'object' ? {
      hero: projectEntityRef(selected.hero),
      ...heroTraits(selected),
      attributes: {
        strength: projectAttribute(selected.attributes?.strength),
        agility: projectAttribute(selected.attributes?.agility),
        intelligence: projectAttribute(selected.attributes?.intelligence),
      },
      ...pickNumbers(selected, ['damageMin', 'damageMax', 'attackRate', 'attackRange', 'movementSpeed', 'armor', 'magicResistance'], { nullable: true }),
      abilities: (Array.isArray(selected.abilities) ? selected.abilities : []).map((row) => projectAbilityMechanics(row, true)),
      talents: (Array.isArray(selected.talents) ? selected.talents : []).map((row) => ({ ability: projectEntityRef(row?.ability) })),
    } : null,
    heroes: (Array.isArray(mechanics?.heroes) ? mechanics.heroes : []).map((hero) => ({
      hero: projectEntityRef(hero?.hero),
      ...heroTraits(hero),
      attackRange: Number.isFinite(hero?.attackRange) ? hero.attackRange : null,
      abilities: (Array.isArray(hero?.abilities) ? hero.abilities : []).map((row) => projectAbilityMechanics(row, false)),
    })),
    items: (Array.isArray(mechanics?.items) ? mechanics.items : []).map((item) => ({
      item: projectEntityRef(item?.item),
      cost: Number.isFinite(item?.cost) ? item.cost : null,
      description: boundedText(item?.description),
      cooldowns: numberArray(item?.cooldowns),
      manaCosts: numberArray(item?.manaCosts),
      castRanges: numberArray(item?.castRanges),
      stats: projectListedValues(item?.stats),
      notes: (Array.isArray(item?.notes) ? item.notes : []).filter((note) => boundedText(note)),
    })),
    patchNotes: projectPatchNotes(mechanics?.patchNotes),
    unavailable: (Array.isArray(mechanics?.unavailable) ? mechanics.unavailable : [])
      .filter((row) => ['hero', 'item', 'patch_notes'].includes(row?.kind))
      .map((row) => ({
        kind: row.kind,
        id: Number.isSafeInteger(row.id) || boundedText(row.id) ? row.id : null,
        reason: typeof row.reason === 'string' && /^[a-z_]{1,40}$/.test(row.reason) ? row.reason : 'unavailable',
      })),
  };
}

export function projectArtifact(model = {}) {
  const sources = Object.fromEntries(['opendota', 'stratz', 'valve', 'entityConstants']
    .filter((name) => Object.hasOwn(model.sources ?? {}, name))
    .map((name) => [name, projectSource(model.sources[name])]));
  const player = Object.fromEntries(['accountId', 'heroId', 'heroName', 'side', 'position', 'lane', 'rank', 'kills', 'deaths', 'assists', 'result']
    .filter((name) => Object.hasOwn(model.player ?? {}, name))
    .map((name) => [name, projectSourced(model.player[name])]));
  const match = Object.fromEntries(['result', 'durationSeconds', 'startTime', 'averageRank', 'gameMode', 'lobbyType']
    .filter((name) => Object.hasOwn(model.match ?? {}, name))
    .map((name) => [name, projectSourced(model.match[name])]));
  const patch = Object.fromEntries(['match', 'current', 'isCurrentExactPatch']
    .filter((name) => Object.hasOwn(model.patch ?? {}, name))
    .map((name) => [name, projectSourced(model.patch[name])]));
  const phases = Array.isArray(model.phases) ? model.phases.map((phase) => ({
    ...pickStrings(phase, ['id', 'interval']),
    ...pickNumbers(phase, ['start', 'end']),
    ...(Object.hasOwn(phase ?? {}, 'metrics') ? { metrics: pickNumbers(phase.metrics, ['gold', 'goldPerMin', 'xp', 'xpPerMin', 'lh', 'lhPerMin', 'denies', 'deniesPerMin', 'heroDamage', 'heroDamagePerMin', 'kills', 'deaths', 'assists'], { nullable: true }) } : {}),
    ...(stringArray(phase?.extremaWithinMatch) !== undefined ? { extremaWithinMatch: stringArray(phase.extremaWithinMatch) } : {}),
  })) : [];
  const summary = Object.fromEntries(['kills', 'deaths', 'assists', 'lh', 'denies', 'gpm', 'xpm', 'netWorth', 'heroDamage', 'towerDamage', 'healing', 'imp']
    .filter((name) => Object.hasOwn(model.summary ?? {}, name))
    .map((name) => [name, projectSourced(model.summary[name])]));
  if (model.summary?.kda) summary.kda = pickScalars(model.summary.kda, ['kills', 'deaths', 'assists', 'source']);
  const series = Object.fromEntries(['gold', 'xp', 'lh', 'denies', 'netWorth']
    .filter((name) => Object.hasOwn(model.series ?? {}, name))
    .map((name) => [name, projectSeries(model.series[name])]));
  const artifact = {
    ...pickScalars(model, ['schemaVersion', 'generatedAt']),
    request: pickScalars(model.request, ['matchId', 'accountId']),
    sources,
    match,
    player,
    participants: Array.from({ length: 10 }, (_, slot) => projectParticipant(model.participants?.[slot], slot)),
    draft: {
      ...pickBooleans(model.draft, ['complete']),
      ...(Array.isArray(model.draft?.radiant) ? { radiant: model.draft.radiant.map(projectSourcedEntity) } : {}),
      ...(Array.isArray(model.draft?.dire) ? { dire: model.draft.dire.map(projectSourcedEntity) } : {}),
      ...(Array.isArray(model.draft?.candidates) ? { candidates: model.draft.candidates.map((candidate) => ({
        ...pickStrings(candidate, ['source']),
        radiant: Array.isArray(candidate?.radiant) ? candidate.radiant.map(projectSourcedEntity) : [],
        dire: Array.isArray(candidate?.dire) ? candidate.dire.map(projectSourcedEntity) : [],
      })) } : {}),
    },
    lane: {
      selectedLane: typeof model.lane?.selectedLane === 'string' ? model.lane.selectedLane : null,
      opponents: Array.isArray(model.lane?.opponents) ? model.lane.opponents.map((opponent) => projectParticipant(opponent, null)) : [],
      status: typeof model.lane?.status === 'string' ? model.lane.status : 'unknown',
      reason: typeof model.lane?.reason === 'string' ? model.lane.reason : null,
      outcome: projectSourced(model.lane?.outcome),
    },
    summary,
    items: {
      purchases: Array.isArray(model.items?.purchases) ? model.items.purchases.map((purchase) => ({
        ...pickScalars(purchase, ['time', 'source']),
        item: projectEntityRef(purchase?.item),
      })) : [],
      finalInventory: Array.isArray(model.items?.finalInventory) ? model.items.finalInventory.map((item) => projectSourcedEntity(item)) : [],
      ...(Array.isArray(model.items?.finalInventoryCandidates) ? {
        finalInventoryCandidates: model.items.finalInventoryCandidates.map((candidate) => ({
          ...pickStrings(candidate, ['source']),
          items: Array.isArray(candidate?.items) ? candidate.items.map((item) => projectSourcedEntity(item)) : [],
        })),
      } : {}),
    },
    series,
    patch,
    phases,
    teamEconomy: projectTeamEconomy(model.teamEconomy),
    objectives: projectObjectives(model.objectives),
    wards: projectWards(model.wards),
    buybacks: projectBuybacks(model.buybacks),
    skillBuild: projectSkillBuild(model.skillBuild),
    mechanics: projectMechanics(model.mechanics),
    baseline: projectBaseline(model.baseline),
    deathAnalysis: {
      contexts: Array.isArray(model.deathAnalysis?.contexts) ? model.deathAnalysis.contexts.map(projectDeathContext) : [],
      patterns: Array.isArray(model.deathAnalysis?.patterns) ? model.deathAnalysis.patterns.map((pattern) => ({
        signature: typeof pattern?.signature === 'string' ? pattern.signature : null,
        times: Array.isArray(pattern?.times) ? pattern.times.filter(Number.isFinite) : [],
        count: Number.isInteger(pattern?.count) ? pattern.count : null,
        representativeDeathTime: Number.isFinite(pattern?.representativeDeathTime) ? pattern.representativeDeathTime : null,
      })) : [],
      priorityDeathTime: Number.isFinite(model.deathAnalysis?.priorityDeathTime) ? model.deathAnalysis.priorityDeathTime : null,
      unresolvedCount: Number.isInteger(model.deathAnalysis?.unresolvedCount) ? model.deathAnalysis.unresolvedCount : null,
    },
    dataQuality: {
      ...pickStrings(model.dataQuality, ['mode']),
      capabilities: Object.fromEntries(Object.entries(model.dataQuality?.capabilities ?? {})),
      ...(stringArray(model.dataQuality?.missing) !== undefined ? { missing: stringArray(model.dataQuality.missing) } : {}),
      ...(stringArray(model.dataQuality?.warnings) !== undefined ? { warnings: stringArray(model.dataQuality.warnings) } : {}),
    },
  };
  if (stringArray(model.warnings) !== undefined) artifact.warnings = stringArray(model.warnings);
  if (model.progress != null) artifact.progress = projectProgress(model.progress);
  return artifact;
}

const BASELINE_METRIC_LABELS = new Map([
  ['lastHits', 'last hits'],
  ['denies', 'denies'],
  ['xp', 'XP'],
  ['heroDamage', 'hero damage'],
  ['netWorth', 'net worth'],
  ['deaths', 'deaths'],
]);

function round(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : 'insufficient data';
}

function baselineRows(baseline) {
  return (baseline?.comparisons ?? []).map((row) => [
    BASELINE_METRIC_LABELS.get(row.metric) ?? row.metric,
    Number.isFinite(row.minute) ? `${row.minute}:00` : 'insufficient data',
    round(row.player),
    round(row.baseline),
    round(row.delta),
    row.ratio == null ? 'insufficient data' : round(row.ratio),
    Number.isFinite(row.matchCount) ? String(row.matchCount) : 'insufficient data',
    row.crossSourceProxy ? 'cross-source proxy' : '—',
  ].join(' | ')).map((line) => `| ${line} |`);
}

function progressMarkdown(progress) {
  if (!progress) return [];
  return [
    '## Personal progress',
    '',
    'Descriptive comparison with prior matches of the same player, hero, position, mode, and exact patch. Differences do not establish a training effect.',
    '',
    table([
      ['status', valueOf(progress.status)], ['reason', valueOf(progress.reason)],
      ['eligible prior matches', valueOf(progress.eligibleMatchCount)],
      ['excluded artifacts', valueOf(progress.excludedMatchCount)],
      ['limitations', list(progress.limitations)],
      ['history load', valueOf(progress.historyLoad?.status)],
      ['skipped history files', valueOf(progress.historyLoad?.skippedFileCount)],
      ['history truncated', valueOf(progress.historyLoad?.truncated)],
    ]),
    '',
    '| Metric | Minute | Current | Prior mean | Delta | Prior matches for metric |',
    '| --- | --- | --- | --- | --- | --- |',
    ...(progress.comparisons ?? []).map((row) => `| ${row.metric} | ${clock(row.minute * 60)} | ${round(row.current)} | ${round(row.mean)} | ${round(row.delta)} | ${round(row.matchCount)} |`),
    '',
    '| Death observation | Current count / deaths | Prior count / deaths | Current share | Mean prior match share | Prior matches |',
    '| --- | --- | --- | --- | --- | --- |',
    ...(progress.deathObservations ?? []).map((row) => `| ${row.observation} | ${round(row.currentCount)} / ${round(row.currentDeaths)} | ${round(row.priorCount)} / ${round(row.priorDeaths)} | ${round(row.currentShare)} | ${round(row.priorMeanShare)} | ${round(row.priorMatchCount)} |`),
    '',
    '| Prior match | Start time (Unix seconds) |',
    '| --- | --- |',
    ...(progress.history ?? []).map((row) => `| ${row.matchId} | ${row.startTime} |`),
    '',
  ];
}

// Pre-horn times such as a ward placed at -30 seconds read as -0:30.
function clock(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const whole = Math.floor(Math.abs(seconds));
  return `${seconds < 0 ? '-' : ''}${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function baselineSampleRows(baseline) {
  const sample = baseline?.sameHeroPositionRankPatch;
  if (!sample) {
    return [['status', valueOf({ value: baseline?.status ?? null })], ['reason', valueOf({ value: baseline?.reason ?? null })]];
  }
  return [
    ['status', valueOf({ value: baseline.status })],
    ['sample', 'hero + position + bracket + weeks of the current patch'],
    ['heroId', valueOf({ value: sample.heroId })],
    ['position', valueOf({ value: sample.position })],
    ['bracket', `${valueOf({ value: sample.bracket })} (${valueOf({ value: sample.bracketLabel })})`],
    ['bracket chosen from', `${valueOf({ value: sample.bracketSource })} (code ${valueOf({ value: sample.rankCode })})`],
    ['patch', valueOf({ value: sample.patch })],
    ['STRATZ weeks', (sample.weeks ?? []).join(', ') || 'insufficient data'],
    ['statistic', `${valueOf({ value: sample.statistic })} (this source gives no percentiles)`],
    ['source', valueOf({ value: sample.source })],
  ];
}

function entityLabel(ref) {
  if (ref?.name) return ref.name;
  if (Number.isSafeInteger(ref?.id)) return `unknown entity (id ${ref.id})`;
  return 'unavailable';
}

function observationValue(value) {
  return value === null ? 'unavailable' : String(value);
}

function participantLabels(rows) {
  return Array.isArray(rows) && rows.length > 0
    ? rows.map((row) => entityLabel(row?.participant?.hero)).join(', ')
    : 'none';
}

function entityUseLabels(events, field) {
  return Array.isArray(events) && events.length > 0
    ? events.map((event) => `${entityLabel(event?.[field])} @ ${clock(event?.time)}`).join(', ')
    : 'none';
}

function repositionLabel(reposition) {
  if (reposition == null) return 'none';
  const cause = typeof reposition.cause === 'string' ? reposition.cause : 'unavailable';
  const basis = reposition.causeItem?.id != null
    ? `item: ${entityLabel(reposition.causeItem)}`
    : reposition.causeAbility?.id != null
      ? `ability: ${entityLabel(reposition.causeAbility)}`
      : 'basis unavailable';
  return `${cause} @ ${clock(reposition.time)} (${basis})`;
}

function deathEvidenceSummary(context) {
  return [
    `nearby allies: ${participantLabels(context?.nearbyAllies)}`,
    `nearby enemies: ${participantLabels(context?.nearbyEnemies)}`,
    `own abilities: ${entityUseLabels(context?.ownAbilityUses, 'ability')}`,
    `own items: ${entityUseLabels(context?.ownItemUses, 'item')}`,
    `recent reposition: ${repositionLabel(context?.recentReposition)}`,
    `nearby deaths: ${participantLabels(context?.nearbyDeaths)}`,
    `nearby kills: ${participantLabels(context?.nearbyKills)}`,
  ].join('; ');
}

function deathFacts(context) {
  const position = context?.position;
  const location = position == null ? 'unavailable' : `${position.x},${position.y} at ${clock(position.time)}`;
  const teamfight = context?.teamfight?.inFight === null ? 'unavailable' : String(context?.teamfight?.inFight);
  return `killer: ${entityLabel(context?.killerHero)}; ability: ${entityLabel(context?.killingAbility)}; item: ${entityLabel(context?.killingItem)}; position: ${location}; teamfight: ${teamfight}; dead: ${valueOf({ value: context?.timeDead })}; ${deathEvidenceSummary(context)}`;
}

function deathObservationFacts(observations = {}) {
  return Object.keys(observations).sort()
    .map((name) => `${name}: ${observationValue(observations[name])}`)
    .join('; ') || '—';
}

const TEAM_MEASURE_LABELS = new Map([
  ['earnedGold', 'earned gold difference'],
  ['xp', 'XP difference'],
  ['netWorth', 'net worth difference'],
]);

function signed(value) {
  if (!Number.isFinite(value)) return '—';
  return value > 0 ? `+${value}` : String(value);
}

function minuteMark(minute) {
  return Number.isInteger(minute) ? `${minute}:00` : '—';
}

function statusRows(section) {
  return [['status', valueOf({ value: section?.status ?? 'unavailable' })], ['reason', valueOf({ value: section?.reason ?? null })]];
}

function recordedValue(value) {
  return Number.isFinite(value) ? signed(value) : 'not recorded';
}

function teamChangeCell(change) {
  if (!change) return '—';
  return `${minuteMark(change.startMinute)} ${recordedValue(change.start)} → ${minuteMark(change.endMinute)} ${recordedValue(change.end)} (change ${recordedValue(change.change)})`;
}

function teamPointCell(point) {
  return point ? `${signed(point.value)} at ${minuteMark(point.minute)}` : 'none';
}

function teamSwingCell(swing) {
  return swing ? `${signed(swing.change)}: ${minuteMark(swing.startMinute)} ${signed(swing.start)} → ${minuteMark(swing.endMinute)} ${signed(swing.end)}` : 'none';
}

function leadChangeCell(rows) {
  return Array.isArray(rows) && rows.length > 0
    ? rows.map((row) => `${minuteMark(row.minute)} ${row.ahead === 'selected_side' ? 'selected side ahead' : 'opponent ahead'}`).join(', ')
    : 'none';
}

function teamEconomyMarkdown(economy) {
  const lines = ['## Team economy', ''];
  const measures = TEAM_MEASURES.filter((name) => economy?.measures?.[name]);
  if (economy?.status !== 'ready' || measures.length === 0) return [...lines, table(statusRows(economy)), ''];
  const labels = measures.map((name) => TEAM_MEASURE_LABELS.get(name));
  return [
    ...lines,
    `Per-minute team difference from the selected side's perspective (${valueOf({ value: economy.perspective })}); a positive value means the selected side is ahead. Earned gold is total gold earned, not net worth. A swing is the largest measured change within ${valueOf({ value: economy.swingWindowMinutes })} minutes; it does not identify a cause.`,
    '',
    `| Phase | Interval (min) | ${labels.join(' | ')} |`,
    `| --- | --- | ${labels.map(() => '---').join(' | ')} |`,
    ...(economy.phases ?? []).map((phase) => `| ${phase.id ?? '—'} | ${phase.interval ?? '—'} | ${measures.map((name) => teamChangeCell(phase[name])).join(' | ')} |`),
    '',
    '| Measure | Max lead | Max deficit | Largest adverse swing | Largest favorable swing | Leader changes |',
    '| --- | --- | --- | --- | --- | --- |',
    ...measures.map((name) => `| ${TEAM_MEASURE_LABELS.get(name)} | ${teamPointCell(economy.extremes?.[name]?.maxLead)} | ${teamPointCell(economy.extremes?.[name]?.maxDeficit)} | ${teamSwingCell(economy.largestSwings?.[name]?.adverse)} | ${teamSwingCell(economy.largestSwings?.[name]?.favorable)} | ${leadChangeCell(economy.leadChanges?.[name])} |`),
    '',
  ];
}

function actorLabel(actor) {
  if (!actor) return 'unavailable';
  if (actor.kind === 'non_hero') return `non-hero unit (${valueOf({ value: actor.side })})`;
  const hero = entityLabel(actor.hero);
  const side = actor.side ? `, ${actor.side}` : '';
  return `${hero}${side}${actor.selectedPlayer ? ', selected player' : ''}`;
}

function buildingLabel(building) {
  if (!building) return 'unknown building';
  const parts = [building.side, building.lane, building.tier ? `tier ${building.tier}` : null, building.barracks, building.kind].filter(Boolean);
  return parts.join(' ');
}

function objectiveDetails(event) {
  switch (event.type) {
    case 'building_destroyed':
      return `${buildingLabel(event.building)}; last hit: ${actorLabel(event.killer)}; denied: ${observationValue(event.denied)}; selected side's building: ${observationValue(event.ownBuilding)}`;
    case 'roshan_killed':
    case 'tormentor_killed':
      return `team: ${valueOf({ value: event.team })}; selected side: ${observationValue(event.bySelectedSide)}${event.participant ? `; player: ${actorLabel(event.participant)}` : ''}`;
    case 'first_blood':
      return `killer: ${actorLabel(event.killer)}; victim: ${actorLabel(event.victim)}`;
    case 'courier_lost':
      return `lost by: ${valueOf({ value: event.lostBy })}; selected side: ${observationValue(event.lostBySelectedSide)}; killer: ${event.killer ? actorLabel(event.killer) : 'unavailable'}`;
    default:
      return `player: ${actorLabel(event.participant)}; selected side: ${observationValue(event.bySelectedSide)}`;
  }
}

function objectivesMarkdown(objectives) {
  const events = Array.isArray(objectives?.events) ? objectives.events : [];
  return [
    '## Objectives',
    '',
    table([...statusRows(objectives), ['unrecognized records', valueOf({ value: objectives?.unrecognizedCount ?? null })]]),
    '',
    '| Time | Event | Details |',
    '| --- | --- | --- |',
    ...(events.length > 0 ? events.map((event) => `| ${clock(event.time)} | ${event.type.replaceAll('_', ' ')} | ${objectiveDetails(event)} |`) : ['| — | — | — |']),
    '',
  ];
}

function wardCountsLabel(counts) {
  return counts ? `${counts.observer} observer / ${counts.sentry} sentry` : 'unavailable';
}

function playerActionsMarkdown(wards, buybacks, skillBuild) {
  const placements = Array.isArray(wards?.selectedPlayer?.placements) ? wards.selectedPlayer.placements : [];
  const upgrades = Array.isArray(skillBuild?.upgrades) ? skillBuild.upgrades : [];
  return [
    '## Wards, buybacks, and skill build',
    '',
    'Ward rows are recorded placements and the time each ward left the game; they do not establish vision, location names, or whether a ward expired or was destroyed. The skill build is the recorded upgrade order, not the hero level of each upgrade.',
    '',
    table([
      ['ward logs', `${valueOf({ value: wards?.status ?? 'unavailable' })}${wards?.reason ? ` (${wards.reason})` : ''}`],
      ['selected player placements', wards?.selectedPlayer ? `${wards.selectedPlayer.observerCount} observer / ${wards.selectedPlayer.sentryCount} sentry` : 'unavailable'],
      ['placements without a usable match time', valueOf({ value: wards?.selectedPlayer?.excludedCount ?? null })],
      ['selected side placements', wardCountsLabel(wards?.teams?.selectedSide)],
      ['opponent side placements', wardCountsLabel(wards?.teams?.opponentSide)],
      ['buyback log', `${valueOf({ value: buybacks?.status ?? 'unavailable' })}${buybacks?.reason ? ` (${buybacks.reason})` : ''}`],
      ['selected player buybacks', buybacks?.status === 'ready' ? list((buybacks.selectedPlayer ?? []).map((row) => clock(row.time))) : 'unavailable'],
      ['selected side / opponent side buybacks', `${valueOf({ value: buybacks?.selectedSideCount ?? null })} / ${valueOf({ value: buybacks?.opponentSideCount ?? null })}`],
      ['skill build', `${valueOf({ value: skillBuild?.status ?? 'unavailable' })}${skillBuild?.reason ? ` (${skillBuild.reason})` : ''}`],
      ['upgrade order', upgrades.length > 0 ? upgrades.map((row) => `${row.order}. ${entityLabel(row.ability)}`).join('; ') : '—'],
    ]),
    '',
    '| Placed | Ward | Left the game | Seconds active |',
    '| --- | --- | --- | --- |',
    ...(placements.length > 0
      ? placements.map((placement) => `| ${clock(placement.time)} | ${placement.kind} | ${placement.endedAt == null ? 'not recorded' : clock(placement.endedAt)} | ${valueOf({ value: placement.secondsActive ?? null })} |`)
      : ['| — | — | — | — |']),
    '',
  ];
}

function levelsLabel(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(' / ') : null;
}

function abilitySummary(row) {
  const parts = [
    row.kind && row.kind !== 'basic' ? row.kind : null,
    levelsLabel(row.cooldowns) ? `cooldown ${levelsLabel(row.cooldowns)}` : null,
    levelsLabel(row.manaCosts) ? `mana ${levelsLabel(row.manaCosts)}` : null,
  ].filter(Boolean);
  return `${entityLabel(row.ability)}${parts.length > 0 ? ` (${parts.join('; ')})` : ''}`;
}

function mechanicsMarkdown(mechanics) {
  const lines = [
    '## Current-patch mechanics',
    '',
    'Valve datafeed values for the current exact patch, with full descriptions in the JSON artifact. They explain what a recorded ability or item does; they do not establish a cooldown, mana, or whether an effect applied at any moment of the match.',
    '',
  ];
  const selected = mechanics?.selectedHero;
  if (!selected) return [...lines, table(statusRows(mechanics)), ''];
  const notes = mechanics.patchNotes;
  const unavailable = Array.isArray(mechanics.unavailable) ? mechanics.unavailable : [];
  return [
    ...lines,
    table([
      ['status', valueOf({ value: mechanics.status })],
      ['patch', valueOf({ value: mechanics.patch })],
      ['selected hero', `${entityLabel(selected.hero)} (${[selected.primaryAttribute, selected.attackType].filter(Boolean).join(', ') || 'traits unavailable'})`],
      ['abilities', list((selected.abilities ?? []).map(abilitySummary))],
      ['talents', list((selected.talents ?? []).map((row) => entityLabel(row.ability)))],
      ['other heroes', list((mechanics.heroes ?? []).map((hero) => entityLabel(hero.hero)))],
      ['items', list((mechanics.items ?? []).map((item) => `${entityLabel(item.item)}${Number.isFinite(item.cost) ? ` (cost ${item.cost})` : ''}`))],
      ['patch notes', notes ? `${valueOf({ value: notes.version })}: ${notes.heroes.length} hero entries, ${notes.items.length} item entries, ${notes.general.length} general sections${notes.generalTruncated ? ' (general notes truncated)' : ''}` : 'unavailable'],
      ['unavailable', list(unavailable.map((row) => `${row.kind} ${row.id ?? '—'} (${row.reason})`))],
    ]),
    '',
  ];
}

export function renderEvidenceMarkdown(model = {}) {
  const request = model.request ?? {};
  const match = model.match ?? {};
  const player = model.player ?? {};
  const quality = model.dataQuality ?? {};
  const phases = phaseRows(model.phases);
  const laneOpponents = Array.isArray(model.lane?.opponents) ? model.lane.opponents : [];
  const contexts = Array.isArray(model.deathAnalysis?.contexts) ? model.deathAnalysis.contexts : [];
  const patterns = Array.isArray(model.deathAnalysis?.patterns) ? model.deathAnalysis.patterns : [];

  return [
    '# Match evidence inventory',
    '',
    'This is an evidence inventory, not the final coaching review. It records facts and unavailable observations without assigning an unrecorded cause.',
    '',
    '## Request and sources',
    '',
    table([['matchId', valueOf(request.matchId)], ['accountId', valueOf(request.accountId)], ['generatedAt', valueOf(model.generatedAt)]]),
    '',
    table(sourceRows(model.sources)),
    '',
    '## Match and selected player',
    '',
    table([
      ['durationSeconds', `${valueOf(match.durationSeconds)} (source: ${sourceOf(match.durationSeconds)})`],
      ['gameMode', `${labelledCell(match.gameMode)} (source: ${sourceOf(match.gameMode)})`],
      ['lobbyType', `${labelledCell(match.lobbyType)} (source: ${sourceOf(match.lobbyType)})`],
      ['hero', `${valueOf(player.heroName)} (source: ${sourceOf(player.heroName)})`],
      ['position', `${valueOf(player.position)} (source: ${sourceOf(player.position)})`],
      ['lane', `${valueOf(player.lane)} (source: ${sourceOf(player.lane)})`],
      ['result', `${valueOf(player.result)} (source: ${sourceOf(player.result)})`],
      ['K / D / A', `${valueOf(player.kills)} / ${valueOf(player.deaths)} / ${valueOf(player.assists)}`],
    ]),
    '',
    '## Participants and actual lane opponents',
    '',
    '| Slot | Side | Position | Lane | Hero | Playback |',
    '| --- | --- | --- | --- | --- | --- |',
    ...(Array.isArray(model.participants) && model.participants.length > 0
      ? model.participants.map((participant) => `| ${valueOf({ value: participant.slot })} | ${valueOf({ value: participant.side })} | ${valueOf({ value: participant.position })} | ${valueOf({ value: participant.lane })} | ${entityLabel(participant.hero)} | ${String(participant.playbackAvailable)} |`)
      : ['| — | — | — | — | — | — |']),
    '',
    table([
      ['selectedLane', valueOf({ value: model.lane?.selectedLane })],
      ['lane status', valueOf({ value: model.lane?.status })],
      ['lane reason', valueOf({ value: model.lane?.reason })],
      ['lane outcome', `${valueOf(model.lane?.outcome)} (source: ${sourceOf(model.lane?.outcome)})`],
      ['actual opponents', list(laneOpponents.map((opponent) => entityLabel(opponent.hero)))],
    ]),
    '',
    '## Phases and baseline',
    '',
    '| Phase | Interval (min) | Metrics | Extremes within the match |',
    '| --- | --- | --- | --- |',
    ...(phases.length > 0 ? phases : ['| — | — | — | — |']),
    '',
    table(baselineSampleRows(model.baseline)),
    '',
    '| Metric | Minute | Player | Baseline (mean) | Delta | Ratio | Matches in sample | Caveat |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(baselineRows(model.baseline).length > 0 ? baselineRows(model.baseline) : ['| — | — | — | — | — | — | — | — |']),
    '',
    ...teamEconomyMarkdown(model.teamEconomy),
    ...objectivesMarkdown(model.objectives),
    ...playerActionsMarkdown(model.wards, model.buybacks, model.skillBuild),
    ...mechanicsMarkdown(model.mechanics),
    '## Death contexts',
    '',
    '| Time | Facts | Observations | Unavailable |',
    '| --- | --- | --- | --- |',
    ...(contexts.length > 0
      ? contexts.map((context) => `| ${clock(context.time)} | ${deathFacts(context)} | ${deathObservationFacts(context.observations)} | ${list(context.unavailable)} |`)
      : ['| — | — | — | — |']),
    '',
    '## Death patterns and priority time',
    '',
    '| Pattern | Times | Count | Representative death |',
    '| --- | --- | --- | --- |',
    ...(patterns.length > 0
      ? patterns.map((pattern) => `| ${valueOf({ value: pattern.signature })} | ${list(pattern.times?.map(clock))} | ${valueOf({ value: pattern.count })} | ${clock(pattern.representativeDeathTime)} |`)
      : ['| — | — | — | — |']),
    '',
    table([
      ['priorityDeathTime', clock(model.deathAnalysis?.priorityDeathTime)],
      ['unresolvedCount', valueOf({ value: model.deathAnalysis?.unresolvedCount })],
    ]),
    '',
    ...progressMarkdown(model.progress),
    '## Capabilities, missing, and warnings',
    '',
    table([
      ['mode', valueOf(quality.mode)],
      ...Object.keys(quality.capabilities ?? {}).sort().map((name) => [name, observationValue(quality.capabilities[name])]),
      ['missing', list(quality.missing)],
      ['warnings', list(quality.warnings ?? model.warnings)],
    ]),
    '',
  ].join('\n');
}

async function atomicWrite(finalPath, contents) {
  const temporaryPath = `${finalPath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function writeArtifacts(model, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const evidence = projectArtifact(model);
  const base = path.join(outputDir, String(evidence.request.matchId));
  const jsonPath = `${base}.json`;
  const markdownPath = `${base}.md`;
  await atomicWrite(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  await atomicWrite(markdownPath, renderEvidenceMarkdown(evidence));
  return { jsonPath, markdownPath };
}

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
        ? sample.points.map((point) => pickNumbers(point, BASELINE_POINT_FIELDS, { nullable: true }))
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

function projectSource(source) {
  const projected = pickScalars(source, ['status', 'reason', 'matchPatch', 'currentPatch', 'isCurrentExactPatch']);
  if (source?.error && typeof source.error.code === 'string') projected.error = { code: source.error.code };
  if (source?.parse && typeof source.parse === 'object') projected.parse = pickScalars(source.parse, ['requested', 'state']);
  return projected;
}

function projectSeries(series) {
  const projected = pickScalars(series, ['source']);
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
  const series = Object.fromEntries(['gold', 'xp', 'lh', 'denies']
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

function clock(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
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

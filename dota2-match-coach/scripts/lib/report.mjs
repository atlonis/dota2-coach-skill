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
  return ['| Поле | Значение |', '| --- | --- |', ...rows.map(([name, value]) => `| ${name} | ${value} |`)].join('\n');
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

// Поле с человекочитаемым лейблом: rank, game mode, lobby type. Нерешённое поле
// печатает кандидатов, чтобы несравнимый словарь не выглядел отсутствием данных.
function labelledCell(field, unknown = 'лейбл неизвестен') {
  const value = valueOf(field);
  if (field?.value == null) {
    const candidates = Array.isArray(field?.candidates) ? field.candidates : [];
    return candidates.length > 0
      ? `${value} (кандидаты: ${candidates.map((candidate) => `${valueOf(candidate)} (${sourceOf(candidate)})`).join(', ')})`
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
      ...pickStrings(sample, ['position', 'bracket', 'bracketLabel', 'patch', 'statistic', 'source']),
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

function projectEventList(values, fields) {
  return Array.isArray(values) ? values.map((event) => pickScalars(event, fields)) : [];
}

function projectSeries(series) {
  const projected = pickScalars(series, ['source']);
  projected.values = Array.isArray(series?.values)
    ? series.values.filter((value) => value === null || Number.isFinite(value))
    : [];
  return projected;
}

function normalizedArtifactModel(model) {
  const sources = Object.fromEntries(['opendota', 'stratz', 'valve']
    .filter((name) => Object.hasOwn(model.sources ?? {}, name))
    .map((name) => [name, projectSource(model.sources[name])]));
  const player = Object.fromEntries(['accountId', 'heroId', 'side', 'position', 'lane', 'rank', 'kills', 'deaths', 'assists', 'result']
    .filter((name) => Object.hasOwn(model.player ?? {}, name))
    .map((name) => [name, projectSourced(model.player[name])]));
  const match = Object.fromEntries(['result', 'durationSeconds', 'startTime', 'gameMode', 'lobbyType']
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
  const eventFields = {
    kills: ['time', 'target', 'byAbility', 'byItem', 'positionX', 'positionY', 'isGank', 'isSmoke', 'source'],
    deaths: ['time', 'attacker', 'byAbility', 'byItem', 'positionX', 'positionY', 'timeDead', 'isFeed', 'source'],
    assists: ['time', 'target', 'positionX', 'positionY', 'source'],
    cs: ['time', 'npcId', 'byAbility', 'byItem', 'gold', 'xp', 'positionX', 'positionY', 'isCreep', 'isNeutral', 'isAncient', 'source'],
    purchases: ['time', 'itemId', 'source'],
    runes: ['time', 'rune', 'action', 'gold', 'positionX', 'positionY', 'source'],
    abilityUses: ['time', 'abilityId', 'source'],
    itemUses: ['time', 'itemId', 'source'],
    positions: ['time', 'x', 'y', 'source'],
    teamfights: ['start', 'end', 'source'],
    objectives: ['time', 'type', 'source'],
  };
  const events = Object.fromEntries(Object.entries(eventFields)
    .map(([name, fields]) => [name, projectEventList(model.events?.[name], fields)]));
  const series = Object.fromEntries(['gold', 'xp', 'lh', 'denies']
    .filter((name) => Object.hasOwn(model.series ?? {}, name))
    .map((name) => [name, projectSeries(model.series[name])]));
  const artifact = {
    ...pickScalars(model, ['schemaVersion', 'generatedAt']),
    request: pickScalars(model.request, ['matchId', 'accountId']),
    sources,
    match,
    player,
    draft: {
      ...pickBooleans(model.draft, ['complete']),
      ...(Array.isArray(model.draft?.radiant) ? { radiant: model.draft.radiant.map(projectSourced) } : {}),
      ...(Array.isArray(model.draft?.dire) ? { dire: model.draft.dire.map(projectSourced) } : {}),
      ...(Array.isArray(model.draft?.candidates) ? { candidates: model.draft.candidates.map((candidate) => ({
        ...pickStrings(candidate, ['source']),
        radiant: Array.isArray(candidate?.radiant) ? candidate.radiant.map(projectSourced) : [],
        dire: Array.isArray(candidate?.dire) ? candidate.dire.map(projectSourced) : [],
      })) } : {}),
    },
    lane: {
      ...(Array.isArray(model.lane?.opponentHeroIds) ? { opponentHeroIds: model.lane.opponentHeroIds.map(projectSourced) } : {}),
      ...(Object.hasOwn(model.lane ?? {}, 'outcome') ? { outcome: projectSourced(model.lane.outcome) } : {}),
      ...(Object.hasOwn(model.lane ?? {}, 'efficiency') ? { efficiency: projectSourced(model.lane.efficiency) } : {}),
    },
    summary,
    items: {
      purchases: projectEventList(model.items?.purchases, ['time', 'item', 'source']),
      finalInventory: Array.isArray(model.items?.finalInventory) ? model.items.finalInventory.map(projectSourced) : [],
      ...(Array.isArray(model.items?.finalInventoryCandidates) ? {
        finalInventoryCandidates: model.items.finalInventoryCandidates.map((candidate) => ({
          ...pickStrings(candidate, ['source']),
          items: Array.isArray(candidate?.items) ? candidate.items.map(projectSourced) : [],
        })),
      } : {}),
    },
    events,
    series,
    patch,
    phases,
    baseline: projectBaseline(model.baseline),
    eventInventory: pickBooleans(model.eventInventory, ['timedEvents', 'deaths', 'positions', 'fights', 'runes', 'abilityUses']),
    dataQuality: {
      ...pickStrings(model.dataQuality, ['mode']),
      ...(model.dataQuality?.gates ? { gates: pickBooleans(model.dataQuality.gates, ['scoreboard', 'phase_aggregates', 'draft_ready', 'event_ready', 'baseline_ready', 'current_patch']) } : {}),
      ...(stringArray(model.dataQuality?.missing) !== undefined ? { missing: stringArray(model.dataQuality.missing) } : {}),
      ...(stringArray(model.dataQuality?.warnings) !== undefined ? { warnings: stringArray(model.dataQuality.warnings) } : {}),
    },
  };
  if (stringArray(model.warnings) !== undefined) artifact.warnings = stringArray(model.warnings);
  const duration = artifact.match.durationSeconds?.value;
  const inMatch = (time) => Number.isFinite(duration) && Number.isFinite(time) && time >= 0 && time <= duration;
  for (const name of ['kills', 'deaths', 'assists', 'cs', 'purchases', 'runes', 'abilityUses', 'itemUses', 'positions', 'objectives']) {
    artifact.events[name] = artifact.events[name].filter((event) => inMatch(event.time));
  }
  artifact.items.purchases = artifact.items.purchases.filter((purchase) => inMatch(purchase.time));
  artifact.events.teamfights = artifact.events.teamfights.filter((fight) => inMatch(fight.start)
    && inMatch(fight.end) && fight.start <= fight.end);
  const hasTimed = (name, field = 'time') => artifact.events[name].some((event) => Number.isFinite(event[field]));
  const projectedEventReady = hasTimed('deaths')
    && (hasTimed('positions') || hasTimed('teamfights', 'start') || hasTimed('runes') || hasTimed('abilityUses'));
  if (!projectedEventReady) {
    artifact.dataQuality.gates.event_ready = false;
    artifact.dataQuality.mode = 'degraded';
    if (!artifact.dataQuality.missing.includes('event timeline')) artifact.dataQuality.missing.push('event timeline');
  }
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
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : 'недостаточно данных';
}

function baselineRows(baseline) {
  return (baseline?.comparisons ?? []).map((row) => [
    BASELINE_METRIC_LABELS.get(row.metric) ?? row.metric,
    Number.isFinite(row.minute) ? `${row.minute}:00` : 'недостаточно данных',
    round(row.player),
    round(row.baseline),
    round(row.delta),
    row.ratio == null ? 'недостаточно данных' : round(row.ratio),
    Number.isFinite(row.matchCount) ? String(row.matchCount) : 'недостаточно данных',
    row.crossSourceProxy ? 'cross-source proxy' : '—',
  ].join(' | ')).map((line) => `| ${line} |`);
}

function baselineSampleRows(baseline) {
  const sample = baseline?.sameHeroPositionRankPatch;
  if (!sample) {
    return [['статус', valueOf({ value: baseline?.status ?? null })], ['причина', valueOf({ value: baseline?.reason ?? null })]];
  }
  return [
    ['статус', valueOf({ value: baseline.status })],
    ['выборка', 'hero + position + bracket + недели текущего патча'],
    ['heroId', valueOf({ value: sample.heroId })],
    ['position', valueOf({ value: sample.position })],
    ['bracket', `${valueOf({ value: sample.bracket })} (${valueOf({ value: sample.bracketLabel })})`],
    ['patch', valueOf({ value: sample.patch })],
    ['недели STRATZ', (sample.weeks ?? []).join(', ') || 'недостаточно данных'],
    ['статистика', `${valueOf({ value: sample.statistic })} (перцентили этим источником не отдаются)`],
    ['источник', valueOf({ value: sample.source })],
  ];
}

export function renderEvidenceMarkdown(model = {}) {
  const request = model.request ?? {};
  const match = model.match ?? {};
  const player = model.player ?? {};
  const draft = model.draft ?? {};
  const inventory = model.eventInventory ?? {};
  const quality = model.dataQuality ?? {};
  const gates = quality.gates ?? {};
  const phases = phaseRows(model.phases);

  return [
    '# Инвентарь доказательств матча',
    '',
    'Это инвентарь доказательств, а не финальный тренерский разбор.',
    'Приоритеты для разбора основаны на зафиксированных фактах: агрегированные метрики — не диагноз и не устанавливают причину.',
    '',
    '## Запрос',
    '',
    table([['matchId', valueOf(request.matchId)], ['accountId', valueOf(request.accountId)], ['generatedAt', valueOf(model.generatedAt)]]),
    '',
    '## Статусы источников',
    '',
    table(sourceRows(model.sources)),
    '',
    '## Паспорт матча и игрока',
    '',
    table([
      ['durationSeconds', `${valueOf(match.durationSeconds)} (источник: ${sourceOf(match.durationSeconds)})`],
      ['gameMode', `${labelledCell(match.gameMode)} (источник: ${sourceOf(match.gameMode)})`],
      ['lobbyType', `${labelledCell(match.lobbyType)} (источник: ${sourceOf(match.lobbyType)})`],
      ['heroId', `${valueOf(player.heroId)} (источник: ${sourceOf(player.heroId)})`],
      ['position', `${valueOf(player.position)} (источник: ${sourceOf(player.position)})`],
      ['rank (средний bracket матча)', `${labelledCell(player.rank)} (источник: ${sourceOf(player.rank)})`],
      ['result', `${valueOf(player.result)} (источник: ${sourceOf(player.result)})`],
      ['K / D / A', `${valueOf(player.kills)} / ${valueOf(player.deaths)} / ${valueOf(player.assists)}`],
    ]),
    '',
    '## Драфт и линия',
    '',
    table([
      ['lane', `${valueOf(player.lane)} (источник: ${sourceOf(player.lane)})`],
      ['lane outcome', `${valueOf(model.lane?.outcome)} (источник: ${sourceOf(model.lane?.outcome)})`],
      ['draft complete', String(Boolean(draft.complete))],
      ['Radiant', list((draft.radiant ?? []).map((pick) => `${valueOf(pick)} (${sourceOf(pick)})`))],
      ['Dire', list((draft.dire ?? []).map((pick) => `${valueOf(pick)} (${sourceOf(pick)})`))],
    ]),
    '',
    '## Фазы: факты',
    '',
    '| Фаза | Интервал (мин.) | Метрики | Экстремумы внутри матча |',
    '| --- | --- | --- | --- |',
    ...(phases.length > 0 ? phases : ['| — | — | — | — |']),
    '',
    '## Baseline: hero + position + bracket + патч',
    '',
    table(baselineSampleRows(model.baseline)),
    '',
    '| Метрика | Минута | Игрок | Baseline (среднее) | Δ | Отношение | Матчей в выборке | Оговорка |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(baselineRows(model.baseline).length > 0 ? baselineRows(model.baseline) : ['| — | — | — | — | — | — | — | — |']),
    '',
    '## Инвентарь событий',
    '',
    table(Object.keys(inventory).sort().map((name) => [name, String(Boolean(inventory[name]))])),
    '',
    '## Гейты данных',
    '',
    table([['mode', valueOf(quality.mode)], ...Object.keys(gates).sort().map((name) => [name, String(Boolean(gates[name]))])]),
    '',
    '## Отсутствующие данные и предупреждения',
    '',
    table([['missing', list(quality.missing)], ['warnings', list(quality.warnings ?? model.warnings)]]),
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
  const evidence = normalizedArtifactModel(model);
  const base = path.join(outputDir, String(evidence.request.matchId));
  const jsonPath = `${base}.json`;
  const markdownPath = `${base}.md`;
  await atomicWrite(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  await atomicWrite(markdownPath, renderEvidenceMarkdown(evidence));
  return { jsonPath, markdownPath };
}

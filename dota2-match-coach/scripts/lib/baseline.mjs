import { SourceError, requestJson } from './http.mjs';

const DEFAULT_ENDPOINT = 'https://api.stratz.com/graphql';
const WEEK_SECONDS = 604_800;
const MAX_WEEKS = 6;
const MAX_BASELINE_MINUTE = 75;

// STRATZ `heroStats.stats` знает только грубый bracket из четырёх корзин.
// Сузить его до конкретной медали нельзя, поэтому лейбл называет диапазон.
const BRACKETS = [
  { id: 'HERALD_GUARDIAN', label: 'Herald–Guardian', tiers: [1, 2] },
  { id: 'CRUSADER_ARCHON', label: 'Crusader–Archon', tiers: [3, 4] },
  { id: 'LEGEND_ANCIENT', label: 'Legend–Ancient', tiers: [5, 6] },
  { id: 'DIVINE_IMMORTAL', label: 'Divine–Immortal', tiers: [7, 8] },
];

// matchCount и winCount складываются: это счётчики выборки, а не средние на игрока.
const BASELINE_COUNTS = ['matchCount', 'winCount'];
const BASELINE_MEANS = ['networth', 'cs', 'dn', 'xp', 'level', 'kills', 'deaths', 'assists', 'heroDamage'];

const STATS_FIELDS = 'time matchCount winCount networth cs dn xp level kills deaths assists heroDamage';

export function bracketBasicFor(rankCode) {
  if (typeof rankCode !== 'number' || !Number.isInteger(rankCode)) return null;
  const tier = Math.floor(rankCode / 10);
  return BRACKETS.find((bracket) => bracket.tiers.includes(tier)) ?? null;
}

export function positionEnumFor(position) {
  return typeof position === 'number' && Number.isInteger(position) && position >= 1 && position <= 5
    ? `POSITION_${position}`
    : null;
}

export function weekIndexOf(epochSeconds) {
  return Math.floor(epochSeconds / WEEK_SECONDS);
}

// Только недели, целиком лежащие внутри текущего патча: неделя, пересекающая
// границу патча, смешала бы два набора правил и сломала exact-patch дисциплину.
export function fullWeeksWithin(patchStartSeconds, nowSeconds, { maxWeeks = MAX_WEEKS } = {}) {
  if (!Number.isFinite(patchStartSeconds) || !Number.isFinite(nowSeconds)) return [];
  const first = Math.ceil(patchStartSeconds / WEEK_SECONDS);
  const lastExclusive = Math.floor(nowSeconds / WEEK_SECONDS);
  const weeks = [];
  for (let index = first; index < lastExclusive; index += 1) weeks.push(index);
  return weeks.slice(-maxWeeks);
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function statsAlias(alias, { heroId, position, bracket, week }) {
  return `${alias}: stats(heroIds: [${heroId}], positionIds: [${position}], bracketBasicIds: [${bracket}], `
    + `minTime: 0, maxTime: ${MAX_BASELINE_MINUTE}, groupByTime: true, groupByPosition: true, groupByBracket: true, `
    + `week: ${week * WEEK_SECONDS}) { ${STATS_FIELDS} }`;
}

// Средние взвешиваются размером выборки своей недели, поэтому редкая неделя
// не перевешивает плотную. Каждая минута сохраняет собственный matchCount.
export function mergeWeeklyCurves(curves) {
  const byMinute = new Map();
  for (const curve of curves) {
    if (!Array.isArray(curve)) continue;
    for (const row of curve) {
      if (!row || typeof row !== 'object') continue;
      const minute = row.time;
      const weight = row.matchCount;
      if (!Number.isInteger(minute) || minute < 0 || minute > MAX_BASELINE_MINUTE) continue;
      if (!finite(weight) || weight <= 0) continue;
      const point = byMinute.get(minute) ?? { minute, counts: new Map(), sums: new Map() };
      for (const metric of BASELINE_COUNTS) {
        if (!finite(row[metric])) continue;
        point.counts.set(metric, (point.counts.get(metric) ?? 0) + row[metric]);
      }
      for (const metric of BASELINE_MEANS) {
        if (!finite(row[metric])) continue;
        const previous = point.sums.get(metric) ?? { total: 0, weight: 0 };
        point.sums.set(metric, { total: previous.total + row[metric] * weight, weight: previous.weight + weight });
      }
      byMinute.set(minute, point);
    }
  }
  return [...byMinute.values()]
    .sort((left, right) => left.minute - right.minute)
    .map((point) => {
      const merged = { minute: point.minute };
      for (const metric of BASELINE_COUNTS) {
        if (point.counts.has(metric)) merged[metric] = point.counts.get(metric);
      }
      for (const [metric, { total, weight }] of point.sums) {
        merged[metric] = weight > 0 ? Number((total / weight).toFixed(2)) : null;
      }
      return merged;
    });
}

export function createBaselineClient({ apiKey, fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT } = {}) {
  return {
    async loadPeerBaseline({ heroId, position, bracket, weeks }) {
      if (!apiKey) return { status: 'unavailable', reason: 'missing_token' };
      if (!Number.isInteger(heroId) || !position || !bracket) return { status: 'unavailable', reason: 'selector_incomplete' };
      if (!Array.isArray(weeks) || weeks.length === 0) return { status: 'unavailable', reason: 'no_full_week_in_current_patch' };

      const aliases = weeks.map((week, index) => statsAlias(`w${index}`, { heroId, position, bracket, week }));
      const query = `query HeroBaseline { heroStats { ${aliases.join(' ')} } }`;
      try {
        const response = await requestJson(endpoint, {
          fetchImpl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'STRATZ_API',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ query }),
        });
        const payload = response.data;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new SourceError('invalid_response', 'Malformed GraphQL response');
        }
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          return { status: 'failed', error: { code: 'graphql' } };
        }
        const heroStats = payload.data?.heroStats;
        if (!heroStats || typeof heroStats !== 'object' || Array.isArray(heroStats)) {
          throw new SourceError('invalid_response', 'Malformed GraphQL response');
        }
        const points = mergeWeeklyCurves(weeks.map((_, index) => heroStats[`w${index}`]));
        if (points.length === 0) return { status: 'unavailable', reason: 'empty_sample' };
        return { status: 'ready', heroId, position, bracket, weeks: [...weeks], points };
      } catch (error) {
        return { status: 'failed', error: { code: error instanceof SourceError ? error.code : 'unknown' } };
      }
    },
  };
}

export function bracketLabelFor(bracketId) {
  return BRACKETS.find((bracket) => bracket.id === bracketId)?.label ?? null;
}

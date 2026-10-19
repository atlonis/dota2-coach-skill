import { entityRef } from './entities.mjs';
import { indexForOpenSlot } from './lane.mjs';
import { alignMinuteSeries } from './series.mjs';

// The other nine players are part of the evidence: what the enemy core farmed,
// which item answered whom and when. Each row comes from OpenDota when it has the
// player and falls back to STRATZ; unknown values stay null.

// A major item: worth at least this much and not a recipe. Boots upgrades, Blink
// Dagger and every big item pass; branches, wards and consumables do not.
export const MAJOR_ITEM_MIN_COST = 1400;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberOrNull(value) {
  return finite(value) ? value : null;
}

function slotOf(player) {
  return Number.isInteger(player?.player_slot) ? indexForOpenSlot(player.player_slot) : null;
}

function itemIdForPurchase(entry, itemConstants) {
  if (finite(entry?.item_id)) return entry.item_id;
  const id = itemConstants?.[entry?.key]?.id;
  return Number.isSafeInteger(id) ? id : null;
}

function majorItemIds(itemConstants) {
  const ids = new Set();
  for (const [key, item] of Object.entries(itemConstants ?? {})) {
    if (key.startsWith('recipe_') || !Number.isSafeInteger(item?.id) || !finite(item?.cost)) continue;
    if (item.cost >= MAJOR_ITEM_MIN_COST) ids.add(item.id);
  }
  return ids;
}

// The first purchase of each major item. A later re-buy (a second BKB charge or
// a re-bought Gem) is not a new timing.
function majorItemTimings(purchases, major, catalog) {
  const seen = new Set();
  const rows = [];
  for (const { time, itemId } of purchases.slice().sort((left, right) => left.time - right.time)) {
    if (!major.has(itemId) || seen.has(itemId)) continue;
    seen.add(itemId);
    rows.push({ time, item: entityRef(catalog, 'item', itemId) });
  }
  return rows;
}

function openPurchases(player, itemConstants) {
  return (Array.isArray(player?.purchase_log) ? player.purchase_log : [])
    .filter((entry) => finite(entry?.time))
    .map((entry) => ({ time: entry.time, itemId: itemIdForPurchase(entry, itemConstants) }))
    .filter((entry) => entry.itemId != null);
}

function stratzPurchases(player) {
  return (Array.isArray(player?.playbackData?.purchaseEvents) ? player.playbackData.purchaseEvents : [])
    .filter((event) => finite(event?.time) && finite(event?.itemId))
    .map((event) => ({ time: event.time, itemId: event.itemId }));
}

function itemList(ids, catalog) {
  return ids.filter((id) => finite(id) && id > 0).map((id) => entityRef(catalog, 'item', id));
}

const MINUTE_TEN_SERIES = [['lastHits', 'lh_t'], ['denies', 'dn_t'], ['gold', 'gold_t'], ['xp', 'xp_t'], ['netWorth', 'networth_t']];

// Cumulative values at the 10:00 marker, keyed by the replay's recorded minutes.
// `gold` is earned gold, not net worth.
export function minuteTenValues(player, durationSeconds) {
  if (!player || (finite(durationSeconds) && durationSeconds < 600)) return null;
  const values = {};
  let any = false;
  for (const [name, key] of MINUTE_TEN_SERIES) {
    const aligned = alignMinuteSeries(player[key], player.times);
    const value = Array.isArray(aligned.values) ? aligned.values[10] : null;
    values[name] = finite(value) ? value : null;
    any ||= finite(value);
  }
  values.laneEfficiencyPct = numberOrNull(player.lane_efficiency_pct);
  return any ? values : null;
}

export function buildPlayersTable({ participants = [], openPlayers = [], stratzPlayerFor, itemConstants, catalog, durationSeconds } = {}) {
  const major = majorItemIds(itemConstants);
  return participants.map((participant) => {
    const open = openPlayers.find((player) => slotOf(player) === participant.slot) ?? null;
    const stratz = typeof stratzPlayerFor === 'function' ? stratzPlayerFor(participant) : null;
    const pick = (openValue, stratzValue) => numberOrNull(openValue) ?? numberOrNull(stratzValue);
    const openItems = Array.from({ length: 6 }, (_, index) => open?.[`item_${index}`]);
    const stratzItems = Array.from({ length: 6 }, (_, index) => stratz?.[`item${index}Id`]);
    const finalItems = openItems.some((id) => finite(id) && id > 0) ? itemList(openItems, catalog) : itemList(stratzItems, catalog);
    const purchases = open && Array.isArray(open.purchase_log) ? openPurchases(open, itemConstants) : stratzPurchases(stratz);
    return {
      slot: participant.slot,
      side: participant.side ?? null,
      hero: { id: participant.hero?.id ?? null, name: participant.hero?.name ?? null },
      accountId: participant.accountId ?? null,
      position: participant.position ?? null,
      lane: participant.lane ?? null,
      isRoaming: participant.isRoaming ?? null,
      source: open ? 'opendota' : stratz ? 'stratz' : null,
      kills: pick(open?.kills, stratz?.kills),
      deaths: pick(open?.deaths, stratz?.deaths),
      assists: pick(open?.assists, stratz?.assists),
      lastHits: pick(open?.last_hits, stratz?.numLastHits),
      denies: pick(open?.denies, stratz?.numDenies),
      gpm: pick(open?.gold_per_min, stratz?.goldPerMinute),
      xpm: pick(open?.xp_per_min, stratz?.experiencePerMinute),
      netWorth: pick(open?.net_worth, stratz?.networth),
      heroDamage: pick(open?.hero_damage, stratz?.heroDamage),
      towerDamage: pick(open?.tower_damage, stratz?.towerDamage),
      healing: pick(open?.hero_healing, stratz?.heroHealing),
      level: numberOrNull(open?.level),
      leaverStatus: numberOrNull(open?.leaver_status),
      finalItems,
      backpack: itemList([open?.backpack_0, open?.backpack_1, open?.backpack_2], catalog),
      neutralItem: finite(open?.item_neutral) && open.item_neutral > 0 ? entityRef(catalog, 'item', open.item_neutral) : null,
      majorItems: majorItemTimings(purchases, major, catalog),
      minute10: minuteTenValues(open, durationSeconds),
    };
  });
}

// OpenDota's leaver codes: 2 and above mean the player abandoned (odota/core
// counts `abandons` the same way); 1 is a disconnect that ended in a reconnect.
export function abandonsFrom(players) {
  return players
    .filter((row) => Number.isInteger(row.leaverStatus) && row.leaverStatus >= 2)
    .map((row) => ({ slot: row.slot, side: row.side, hero: row.hero, leaverStatus: row.leaverStatus }));
}

const PERCENTILE_METRICS = [
  'gold_per_min', 'xp_per_min', 'last_hits_per_min', 'denies_per_min', 'kills_per_min', 'deaths_per_min',
  'assists_per_min', 'hero_damage_per_min', 'hero_healing_per_min', 'tower_damage',
];
const PERCENTILE_NAMES = new Map([
  ['gold_per_min', 'gpm'], ['xp_per_min', 'xpm'], ['last_hits_per_min', 'lastHitsPerMin'], ['denies_per_min', 'deniesPerMin'],
  ['kills_per_min', 'killsPerMin'], ['deaths_per_min', 'deathsPerMin'], ['assists_per_min', 'assistsPerMin'],
  ['hero_damage_per_min', 'heroDamagePerMin'], ['hero_healing_per_min', 'heroHealingPerMin'], ['tower_damage', 'towerDamage'],
]);

function percent(value) {
  return finite(value) && value >= 0 && value <= 1 ? Math.round(value * 100) : null;
}

// OpenDota ranks the player's whole-match rates against the same hero's players
// in the public matches it sampled during the previous hour (any position; Turbo
// against Turbo only). It reports no sample size. For deaths the percentile is the
// share of the sample with more deaths per minute, so higher means fewer deaths.
export function buildPercentiles(openPlayer, modeClass) {
  if (modeClass !== 'standard' && modeClass !== 'turbo') {
    return { status: 'unavailable', reason: modeClass === 'unknown' ? 'game_mode_unknown' : 'non_standard_mode', source: null, population: null, metrics: [] };
  }
  const benchmarks = openPlayer?.benchmarks;
  if (!benchmarks || typeof benchmarks !== 'object') {
    return { status: 'unavailable', reason: 'benchmarks_unavailable', source: null, population: null, metrics: [] };
  }
  const metrics = PERCENTILE_METRICS
    .filter((metric) => benchmarks[metric] && typeof benchmarks[metric] === 'object')
    .map((metric) => ({
      metric: PERCENTILE_NAMES.get(metric),
      value: finite(benchmarks[metric].raw) ? Number(benchmarks[metric].raw.toFixed(3)) : null,
      percentile: percent(benchmarks[metric].pct),
      bracketPercentile: percent(benchmarks[metric].pct_bracket),
    }))
    // A zero is tied with every other zero, which inflates its rank: 0 healing on
    // a hero that rarely heals reads as a high percentile.
    .filter((row) => row.percentile != null && row.value !== 0);
  if (metrics.length === 0) return { status: 'unavailable', reason: 'benchmarks_unavailable', source: null, population: null, metrics: [] };
  return {
    status: 'ready',
    reason: null,
    source: 'opendota',
    population: modeClass === 'turbo' ? 'same_hero_recent_turbo_matches' : 'same_hero_recent_public_matches',
    metrics,
  };
}

// Modes whose economy and timings match normal matchmaking. Turbo is its own
// class: OpenDota keeps separate Turbo benchmarks, but no normal-game norm applies.
const STANDARD_MODES = new Set([1, 2, 3, 4, 5, 8, 12, 13, 16, 22]);
const BOT_LOBBY = 4;

export function modeClassFor(gameMode, lobbyType) {
  if (!Number.isInteger(gameMode) || gameMode === 0) return 'unknown';
  if (gameMode === 23) return 'turbo';
  if (lobbyType === BOT_LOBBY) return 'non_standard';
  return STANDARD_MODES.has(gameMode) ? 'standard' : 'non_standard';
}

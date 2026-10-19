import { indexForOpenSlot } from './lane.mjs';

// Deaths, kills and fight involvement from a parsed OpenDota match. They need no
// STRATZ token: `deaths_log` lists every death of a player with its killer unit,
// seconds dead and gold lost, and matched the scoreboard deaths in every parsed
// 7.41f match checked. Older parses lack it; there each death is rebuilt from the
// other players' `kills_log`, which names hero kills only, so a death to a tower,
// creep or neutral stays unresolved.

// A death can happen before the horn: the pre-game clock starts at -1:30.
export const EARLIEST_EVENT_TIME = -90;
// The parser closes a teamfight after a quiet spell, so a fight that runs into
// the end of the match is often missing. A death this close to the end that no
// recorded fight covers has an unknown fight status rather than "no fight".
export const FINAL_FIGHT_MARGIN_SECONDS = 30;
// OpenDota records a teamfight only for a cluster of at least three deaths.
export const TEAMFIGHT_MIN_DEATHS = 3;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function heroUnitMaps(heroConstants) {
  const idByUnit = new Map();
  const unitById = new Map();
  for (const hero of Object.values(heroConstants ?? {})) {
    if (typeof hero?.name !== 'string' || !Number.isSafeInteger(hero?.id)) continue;
    idByUnit.set(hero.name, hero.id);
    unitById.set(hero.id, hero.name);
  }
  return { idByUnit, unitById };
}

function slotOf(player) {
  return Number.isInteger(player?.player_slot) ? indexForOpenSlot(player.player_slot) : null;
}

export function openPlayerForSlot(openPlayers, slot) {
  if (!Number.isInteger(slot) || !Array.isArray(openPlayers)) return null;
  const matches = openPlayers.filter((player) => slotOf(player) === slot);
  return matches.length === 1 ? matches[0] : null;
}

function unitSide(unit) {
  if (unit.includes('goodguys')) return 'radiant';
  if (unit.includes('badguys')) return 'dire';
  return null;
}

// A readable label for a non-hero unit, without the engine prefix: towers, lane
// creeps, neutrals, Roshan, the Tormentor and summoned units.
export function nonHeroKiller(unit) {
  const side = unitSide(unit);
  const name = unit.replace(/^npc_dota_/, '');
  let unitClass = 'unit';
  if (/(^|_)tower\d/.test(name) || /_fort$/.test(name) || /_rax_/.test(name) || /^(goodguys|badguys)_(filler|healers)/.test(name)) unitClass = 'building';
  else if (name.startsWith('creep_') || /^(goodguys|badguys)_siege/.test(name)) unitClass = 'lane_creep';
  else if (name.startsWith('neutral_')) unitClass = 'neutral';
  else if (name.startsWith('roshan')) unitClass = 'roshan';
  else if (name.startsWith('miniboss')) unitClass = 'tormentor';
  return { kind: 'non_hero', unitClass, side, label: name.replace(/_/g, ' ').trim() };
}

function heroKiller(heroId, participants) {
  const participant = (participants ?? []).find((row) => row?.hero?.id === heroId) ?? null;
  return { kind: 'hero', heroId, slot: participant?.slot ?? null, side: participant?.side ?? null };
}

export function killerFromUnit(unit, { idByUnit }, participants) {
  if (typeof unit !== 'string' || !unit) return null;
  const heroId = idByUnit.get(unit);
  if (heroId != null) return heroKiller(heroId, participants);
  if (unit.startsWith('npc_dota_hero_')) return { kind: 'hero', heroId: null, slot: null, side: null };
  return nonHeroKiller(unit);
}

function inWindow(time, durationSeconds) {
  return finite(time) && time >= EARLIEST_EVENT_TIME && (!finite(durationSeconds) || time <= durationSeconds);
}

// The selected player's deaths, from their own `deaths_log` or, failing that, from
// the other players' `kills_log`.
export function openDotaDeaths({ openPlayers = [], selectedSlot, participants = [], heroMaps, durationSeconds } = {}) {
  const openPlayer = openPlayerForSlot(openPlayers, selectedSlot);
  if (!openPlayer) return { method: null, deaths: [] };
  if (Array.isArray(openPlayer.deaths_log)) {
    const deaths = openPlayer.deaths_log
      .filter((entry) => inWindow(entry?.time, durationSeconds))
      .map((entry) => ({
        time: entry.time,
        killer: killerFromUnit(entry.key, heroMaps, participants),
        timeDead: finite(entry.time_dead) ? entry.time_dead : null,
        goldLost: finite(entry.gold_lost) ? entry.gold_lost : null,
        source: 'opendota_deaths_log',
      }))
      .sort((left, right) => left.time - right.time);
    return { method: 'deaths_log', deaths };
  }
  const unit = heroMaps.unitById.get(openPlayer.hero_id);
  const killLogs = openPlayers.filter((player) => player !== openPlayer && Array.isArray(player?.kills_log));
  if (!unit || killLogs.length === 0) return { method: null, deaths: [] };
  const deaths = [];
  for (const killer of killLogs) {
    for (const entry of killer.kills_log) {
      if (entry?.key !== unit || !inWindow(entry?.time, durationSeconds)) continue;
      deaths.push({
        time: entry.time,
        killer: heroKiller(killer.hero_id, participants),
        timeDead: null,
        goldLost: null,
        source: 'opendota_kills_log',
      });
    }
  }
  return { method: 'kills_log', deaths: deaths.sort((left, right) => left.time - right.time) };
}

// The selected player's hero kills with their times, for phase counts.
export function openDotaKills({ openPlayers = [], selectedSlot, durationSeconds } = {}) {
  const openPlayer = openPlayerForSlot(openPlayers, selectedSlot);
  if (!Array.isArray(openPlayer?.kills_log)) return null;
  return openPlayer.kills_log.filter((entry) => inWindow(entry?.time, durationSeconds)).map((entry) => ({ time: entry.time }));
}

// Death times of every player on one side, or null unless all five logged them.
export function sideDeathTimes(openPlayers, side) {
  const rows = (Array.isArray(openPlayers) ? openPlayers : []).filter((player) => {
    const slot = slotOf(player);
    return slot != null && (slot < 5 ? 'radiant' : 'dire') === side;
  });
  if (rows.length !== 5 || !rows.every((player) => Array.isArray(player.deaths_log))) return null;
  return rows.flatMap((player) => player.deaths_log
    .filter((entry) => finite(entry?.time))
    .map((entry) => ({ time: entry.time, slot: slotOf(player) })));
}

function involved(row) {
  return row && typeof row === 'object' && (
    row.damage > 0 || row.healing > 0 || row.deaths > 0
    || (row.killed && typeof row.killed === 'object' && Object.keys(row.killed).length > 0));
}

// A recorded teamfight's players are listed in slot order. A hero counts as
// involved when the fight logged its hero damage, healing, a kill or a death.
function fightInvolvement(fight, participants, selectedSlot, selectedSide) {
  if (!Array.isArray(fight?.players) || fight.players.length !== 10 || selectedSide == null) return null;
  const allies = [];
  const enemies = [];
  fight.players.forEach((row, slot) => {
    if (slot === selectedSlot || !involved(row)) return;
    const participant = participants?.[slot];
    const hero = { id: participant?.hero?.id ?? null, name: participant?.hero?.name ?? null };
    if ((slot < 5 ? 'radiant' : 'dire') === selectedSide) allies.push(hero);
    else enemies.push(hero);
  });
  return { allies, enemies };
}

// The death position OpenDota stored inside a fight, in the replay's 128-unit
// map cells. Kept only when the fight logged exactly this one death of the player.
function fightDeathPosition(fight, selectedSlot, deathsInFight) {
  const row = fight?.players?.[selectedSlot];
  if (deathsInFight !== 1 || row?.deaths !== 1 || !row.deaths_pos || typeof row.deaths_pos !== 'object') return null;
  const cells = Object.entries(row.deaths_pos).flatMap(([x, ys]) => Object.entries(ys ?? {}).map(([y, count]) => ({ x: Number(x), y: Number(y), count })));
  if (cells.length !== 1 || cells[0].count !== 1 || !finite(cells[0].x) || !finite(cells[0].y)) return null;
  return { x: cells[0].x, y: cells[0].y, source: 'opendota_teamfight' };
}

export function recordedTeamfightAt({ teamfights, time, durationSeconds, participants, selectedSlot, selectedSide, selectedDeathTimes = [] }) {
  if (!Array.isArray(teamfights)) return { inFight: null, start: null, end: null, involvement: null, position: null };
  const fight = teamfights.find((candidate) => finite(candidate?.start) && finite(candidate?.end)
    && candidate.start <= candidate.end && time >= candidate.start && time <= candidate.end);
  if (fight) {
    const deathsInFight = selectedDeathTimes.filter((value) => value >= fight.start && value <= fight.end).length;
    return {
      inFight: true,
      start: fight.start,
      end: fight.end,
      involvement: fightInvolvement(fight, participants, selectedSlot, selectedSide),
      position: fightDeathPosition(fight, selectedSlot, deathsInFight),
    };
  }
  const nearEnd = finite(durationSeconds) && time >= durationSeconds - FINAL_FIGHT_MARGIN_SECONDS;
  return { inFight: nearEnd ? null : false, start: null, end: null, involvement: null, position: null };
}

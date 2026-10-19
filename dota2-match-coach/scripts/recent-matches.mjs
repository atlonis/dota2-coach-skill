import { pathToFileURL } from 'node:url';
import { accountIdFrom, AnalysisError } from './analyze-match.mjs';
import { createOpenDotaClient } from './lib/opendota.mjs';
import { createValveClient } from './lib/valve.mjs';
import { GAME_MODES } from './lib/vocabulary.mjs';
import { modeClassFor } from './lib/match-players.mjs';
import { relaunchWithProxySupport } from './lib/proxy.mjs';

// Lists a player's recent matches so a review can start without a match ID:
// which ones are on the current exact patch, which are parsed, and the hero.

const DEFAULT_LIMIT = 10;

export function parseRecentArgs(argv) {
  const values = { accountId: null, limit: DEFAULT_LIMIT };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (typeof value !== 'string' || value.startsWith('--')) throw new AnalysisError('invalid_arguments');
    if (flag === '--account-id' && values.accountId == null) values.accountId = accountIdFrom(value);
    else if (flag === '--limit' && /^[1-9]\d?$/.test(value)) values.limit = Math.min(Number(value), 20);
    else throw new AnalysisError('invalid_arguments');
  }
  if (values.accountId == null) throw new AnalysisError('invalid_arguments');
  return values;
}

function clock(seconds) {
  return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '—';
}

export function describeRecentMatches(matches, { heroes = {}, currentPatchStartTime = null } = {}) {
  const heroName = (id) => Object.values(heroes).find((hero) => hero?.id === id)?.localized_name ?? 'unknown hero';
  return (Array.isArray(matches) ? matches : []).map((match) => {
    const radiant = Number.isInteger(match?.player_slot) && match.player_slot < 128;
    const result = typeof match?.radiant_win === 'boolean' ? (match.radiant_win === radiant ? 'win' : 'loss') : '—';
    const mode = GAME_MODES.find((row) => row.id === match?.game_mode)?.label ?? 'unknown mode';
    const modeClass = modeClassFor(match?.game_mode, match?.lobby_type);
    const current = Number.isFinite(currentPatchStartTime) && Number.isFinite(match?.start_time)
      ? match.start_time >= currentPatchStartTime : null;
    return {
      matchId: match?.match_id ?? null,
      startTime: Number.isFinite(match?.start_time) ? new Date(match.start_time * 1000).toISOString().slice(0, 16).replace('T', ' ') : '—',
      hero: heroName(match?.hero_id),
      result,
      kda: [match?.kills, match?.deaths, match?.assists].map((value) => (Number.isFinite(value) ? value : '—')).join('/'),
      duration: clock(match?.duration),
      mode: modeClass === 'standard' ? mode : `${mode} (${modeClass.replace('_', '-')})`,
      parsed: Number.isInteger(match?.version),
      currentPatch: current,
    };
  });
}

export async function runRecent(argv, {
  openDotaClient = createOpenDotaClient({ apiKey: process.env.OPENDOTA_API_KEY }),
  valveClient = createValveClient(),
  stdout = (line) => console.log(line),
  stderr = (line) => console.error(line),
} = {}) {
  try {
    const { accountId, limit } = parseRecentArgs(argv);
    const [matches, valve, heroes] = await Promise.all([
      openDotaClient.loadRecentMatches(accountId),
      valveClient.resolvePatch(Math.floor(Date.now() / 1000)),
      openDotaClient.loadHeroConstants(),
    ]);
    const rows = describeRecentMatches(matches.slice(0, limit), {
      heroes: heroes.status === 'ready' ? heroes.heroes : {},
      currentPatchStartTime: valve.status === 'ready' ? valve.currentPatchStartTime : null,
    });
    if (rows.length === 0) {
      stdout('No recent public matches for this account. Its match data may be private, or the ID may be wrong.');
      return 0;
    }
    stdout(`current patch: ${valve.status === 'ready' ? valve.currentPatch : 'unverified'}`);
    stdout('| Match ID | Start (UTC) | Hero | Result | K/D/A | Duration | Mode | Parsed | Current patch |');
    stdout('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const row of rows) {
      stdout(`| ${row.matchId} | ${row.startTime} | ${row.hero} | ${row.result} | ${row.kda} | ${row.duration} | ${row.mode} | ${row.parsed ? 'yes' : 'no'} | ${row.currentPatch == null ? 'unverified' : row.currentPatch ? 'yes' : 'no'} |`);
    }
    return 0;
  } catch (error) {
    const code = error instanceof AnalysisError ? error.code : error?.code === 'rate_limited' ? 'source_rate_limited' : 'source_unreachable';
    stderr(`error: ${code}`);
    return code === 'invalid_arguments' || code === 'account_vanity_unsupported' ? 2 : 4;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = relaunchWithProxySupport() ?? await runRecent(process.argv.slice(2));
}

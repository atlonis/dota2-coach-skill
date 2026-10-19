import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// A deterministic check of a drafted review against its artifact. It cannot judge
// coaching quality; it catches what an agent most often gets wrong mechanically:
// a timecode or K/D/A that is not in the artifact, a missing TL;DR or drill,
// internal field names in the prose, and a review far past its length limit.

const LIMITS = { full: 900, brief: 350, focused: 600 };
// The top of each mode's normal range in the review template.
const TARGETS = { full: 700, brief: 250, focused: 450 };
const INTERNAL_NAMES = [
  'deathAnalysis', 'contextIncomplete', 'contextReady', 'timelineSource', 'firstAlliedDeathInFight', 'tradedLocally',
  'ownDefensiveItemUsed', 'afterConfirmedTeleport', 'selectedSideOutcome', 'modeClass', 'minute10', 'majorItems',
  'unresolvedCount', 'peerBaseline', 'schemaVersion', 'dataQuality', 'proximityComplete', 'byKiller', 'teamEconomy',
  'opendota_deaths_log', 'opendota_kills_log', 'stratz_playback_unavailable', 'death_position_unavailable', 'npc_dota_',
  'priorityDeathTime', 'killerUnit', 'goldLost', 'timeDead', 'lane_creep',
];
const PLACEHOLDER = /<[A-Za-zА-Яа-я][^<>\n]{0,40}>|\{\{|\}\}|\bTODO\b|\bTBD\b/;
const DRILL_LABEL = /(упражнени|практик|drill|exercise)/i;
const ADVICE_LABEL = /(совет тренера|coach'?s advice)/i;

function clockToSeconds(text) {
  const match = /^(-)?(\d{1,3}):([0-5]\d)$/.exec(text);
  if (!match) return null;
  const seconds = Number(match[2]) * 60 + Number(match[3]);
  return match[1] ? -seconds : seconds;
}

function collectTimes(value, out = new Set(), key = '') {
  if (Array.isArray(value)) {
    for (const item of value) collectTimes(item, out, key);
  } else if (value && typeof value === 'object') {
    for (const [name, child] of Object.entries(value)) collectTimes(child, out, name);
  } else if (Number.isFinite(value) && /(^time$|Time$|^start$|^end$|^endedAt$|^causeTime$|^at$|times|Seconds$)/.test(key)) {
    out.add(Math.round(value));
  }
  return out;
}

// Every time the review may quote: event times anywhere in the artifact, the
// match duration, and any whole-minute marker inside the match.
export function allowedTimes(artifact) {
  const times = collectTimes(artifact);
  const duration = artifact?.match?.durationSeconds?.value;
  if (Number.isFinite(duration)) {
    times.add(duration);
    for (let minute = 0; minute * 60 <= duration + 60; minute += 1) times.add(minute * 60);
  }
  return times;
}

// Counted like `wc -w`: whitespace-separated tokens with a letter or digit, so a
// timecode such as 50:38 is one word.
function wordCount(text) {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function checkReview(review, artifact, { mode } = {}) {
  const errors = [];
  const warnings = [];
  const text = String(review ?? '');
  if (!/TL;DR/i.test(text)) errors.push('missing a "TL;DR:" line with the main finding');
  const drillLines = text.split('\n').filter((line) => DRILL_LABEL.test(line) && /^\s*(?:>\s*)?(?:#+\s*|\*\*|__)/.test(line));
  if (drillLines.length === 0) errors.push('missing a labelled drill section ("Упражнение" / "Drill")');
  if (drillLines.length > 1) warnings.push(`more than one drill heading (${drillLines.length}); a review has one drill`);
  if (!ADVICE_LABEL.test(text)) warnings.push('no "Совет тренера" / "Coach\'s advice" label: is all advice labelled, or is there none?');

  const allowed = allowedTimes(artifact);
  const quoted = [...text.matchAll(/(?<![\d:])(-?\d{1,3}:[0-5]\d)(?![\d:])/g)].map((match) => match[1]);
  const unknown = [...new Set(quoted.filter((clock) => {
    const seconds = clockToSeconds(clock);
    return seconds == null || ![seconds - 1, seconds, seconds + 1].some((candidate) => allowed.has(candidate));
  }))];
  if (unknown.length > 0) errors.push(`timecodes not found in the artifact: ${unknown.join(', ')}`);

  const kda = artifact?.summary?.kda;
  if (kda && [kda.kills, kda.deaths, kda.assists].every(Number.isFinite)) {
    const expected = `${kda.kills}/${kda.deaths}/${kda.assists}`;
    const written = [...text.matchAll(/(?<![\d/])(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/g)].map((match) => `${match[1]}/${match[2]}/${match[3]}`);
    const wrong = written.filter((value) => value !== expected);
    if (written.length > 0 && wrong.length === written.length) errors.push(`K/D/A ${wrong[0]} differs from the artifact's ${expected}`);
  }

  const leaked = INTERNAL_NAMES.filter((name) => text.includes(name));
  if (leaked.length > 0) errors.push(`internal field names in the prose: ${leaked.join(', ')}`);
  if (/\(id \d+\)|unknown entity \(id/i.test(text)) errors.push('an internal ID is shown; name an unknown entity neutrally');
  const placeholder = PLACEHOLDER.exec(text);
  if (placeholder) errors.push(`template placeholder left in the text: ${placeholder[0]}`);

  const words = wordCount(text);
  if (mode && LIMITS[mode] && words > LIMITS[mode]) errors.push(`${words} words, over the ${mode} limit of ${LIMITS[mode]}`);
  else if (mode && TARGETS[mode] && words > TARGETS[mode]) warnings.push(`${words} words, above the usual ${mode} range (up to ${TARGETS[mode]}); trim unless the match needs it`);
  return { ok: errors.length === 0, errors, warnings, words };
}

export async function runCheck(argv, { stdout = (line) => console.log(line), stderr = (line) => console.error(line) } = {}) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!['--artifact', '--review', '--mode'].includes(flag) || typeof value !== 'string') {
      stderr('usage: check-review.mjs --artifact <match>.json --review <draft.md> [--mode full|brief|focused]');
      return 2;
    }
    options[flag.slice(2)] = value;
  }
  if (!options.artifact || !options.review) {
    stderr('usage: check-review.mjs --artifact <match>.json --review <draft.md> [--mode full|brief|focused]');
    return 2;
  }
  const [artifact, review] = await Promise.all([
    readFile(options.artifact, 'utf8').then(JSON.parse),
    readFile(options.review, 'utf8'),
  ]);
  const result = checkReview(review, artifact, { mode: options.mode });
  for (const error of result.errors) stdout(`problem: ${error}`);
  for (const warning of result.warnings) stdout(`note: ${warning}`);
  stdout(result.ok ? `ok (${result.words} words)` : `fix ${result.errors.length} problem(s) before sending`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCheck(process.argv.slice(2));
}

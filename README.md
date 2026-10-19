# Dota 2 Match Coach

[English](README.md) | [Русский](README.ru.md)

An agent skill that reviews a current-patch Dota 2 match like a coach: one main problem, the moment or number that shows it, labelled coach's advice, and one drill for the next game. A bundled runtime collects the match from OpenDota (and optionally STRATZ), verifies the exact current sub-patch against Valve, and writes a normalized evidence artifact. The review quotes facts only from that artifact.

Only the latest exact sub-patch is supported. Matches from earlier patches are rejected, now and in the future.

## What it uses

Without any key, from a parsed OpenDota match:

- every death of the player: time, killer (hero, tower, creeps…), seconds dead, gold lost, whether it fell inside a recorded teamfight and who on each side was involved, including deaths before the horn;
- lane, lane allies and opponents, and everyone's last hits, denies, gold, XP and net worth at 10:00;
- all ten players: K/D/A, farm, damage, final items and the timing of every major item;
- OpenDota percentiles of the player's rates against the same hero;
- team economy, objectives, wards, buybacks, skill build, phases, current-patch mechanics from the Valve datafeed;
- warnings for Turbo and other non-standard modes (no normal-game norms) and for abandons.

With `STRATZ_API_KEY`: positions of all ten heroes, the player's item and ability uses and teleports, full death contexts (who was nearby, isolation, trades), STRATZ's lane result and peer means for the same hero, position and rank bracket.

## Requirements

- Node.js 18+ (22.21+ or 24.5+ behind an HTTP proxy); no `npm install`;
- network access to OpenDota and Valve (and STRATZ when its key is set);
- PowerShell on Windows or POSIX `sh` on macOS/Linux for the wrappers.

## Install

With [Vercel Skills](https://github.com/vercel-labs/skills):

```sh
npx skills add atlonis/dota2-coach-skill --skill dota2-match-coach --global --copy
```

Then, in a new agent session:

```text
Use $dota2-match-coach to review my last game, account 56386500.
Use $dota2-match-coach to review https://www.dotabuff.com/matches/9048031561 for the Skywrath Mage player.
```

The skill accepts a match ID or Dotabuff/OpenDota/STRATZ match link; without one it lists the player's recent matches. The player can be a friend ID, Steam64 ID or profile link, an exact English hero name, or a slot 0–9. A hero or slot works for players who hide their account.

Update or remove:

```sh
npx skills update dota2-match-coach --global --yes
npx skills remove dota2-match-coach --global
```

## Keys

Both optional. Set them in the agent's environment or a secret manager; never in prompts, commands, files or Git.

- `STRATZ_API_KEY`: STRATZ playback and peer means (see above).
- `OPENDOTA_API_KEY`: a higher OpenDota rate limit and faster parse polling.

## Running the runtime directly

```sh
cd dota2-match-coach
node scripts/recent-matches.mjs --account-id 56386500
node scripts/analyze-match.mjs --match-id 9048031561 --account-id 56386500 --output-dir ./output
node scripts/check-review.mjs --artifact ./output/9048031561.json --review draft.md
```

A parsed match takes about 10 seconds; an unparsed one waits for OpenDota's parse, usually 15–60 seconds, up to two minutes. Exit codes, errors and the artifact layout: [runtime](dota2-match-coach/references/runtime.md).

## Reviews

Full (default), brief or focused on a topic (lane, deaths, items, farm, draft, progress). Facts carry their timecodes; hypotheses need two or more independent facts and are labelled; advice is labelled "Совет тренера" / "Coach's advice"; the drill has a self-check the player can count without a replay. The review follows the user's language; Russian reviews use players' vocabulary. See [examples](dota2-match-coach/references/examples.md).

Personal progress compares the match with earlier saved artifacts of the same account, hero, position, mode and patch (`--history-dir`); see [progress](dota2-match-coach/references/progress.md).

## Validation

```sh
node --test test/runtime/*.test.mjs dota2-match-coach/scripts/test/*.test.mjs
```

The suite is offline. It includes real OpenDota responses for 7.41f matches (`test/fixtures/opendota`, other players' account IDs replaced) and runs in CI on Linux and Windows. The coaching answer itself is evaluated with [offline agent scenarios](test/coaching/README.md) and the [benchmark on real matches](test/benchmark/README.md); `check-review.mjs` checks a drafted review against its artifact.

**Live smoke (opt-in).** Pick a fresh current-patch match, then set `DOTA2_COACH_LIVE_MATCH_ID` and `DOTA2_COACH_LIVE_ACCOUNT_ID` (or `DOTA2_COACH_LIVE_HERO`) for the current shell only and run `node --test dota2-match-coach/scripts/test/live-smoke.test.mjs` from the skill root. Without the variables the test skips. Unset them afterwards and never commit their values.

## Repository

```text
dota2-match-coach/          the installed skill
  SKILL.md                 workflow for the agent
  references/              review template, source policy, deaths, decision stack, coaching playbook, examples, runtime, progress
  scripts/                 runtime, recent matches, review check, wrappers, skill tests
test/runtime/              offline suite, including real-response tests
test/fixtures/opendota/    real OpenDota responses used by the suite
test/coaching/             synthetic evaluation of the coaching answer
test/benchmark/            benchmark protocol and results on real matches
research/coaching-videos/  notes from 50 coaching videos and their synthesis
ROADMAP.md, RESEARCH.md    development plan and research
```

## Data sources and attribution

Match data comes from [OpenDota](https://www.opendota.com) and, when a key is set, [STRATZ](https://stratz.com). Patch dates and current-patch mechanics come from Valve's public Dota 2 datafeed. This project is not affiliated with or endorsed by Valve, OpenDota or STRATZ. Dota 2 is a trademark of Valve Corporation. Respect each service's terms and rate limits.

## License

[MIT](LICENSE).

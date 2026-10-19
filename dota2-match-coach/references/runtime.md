# Runtime

The runtime turns a match into a normalized evidence artifact: a JSON file with the facts and a Markdown inventory of the same facts. It needs Node.js 18+ (22.21+ or 24.5+ behind a proxy) and network access; nothing to install. The artifact is evidence, not the review.

## Commands (from the skill root)

```sh
node scripts/analyze-match.mjs --match-id <ID | match link> --account-id <ID | Steam64 | profile link> --output-dir ./output
node scripts/analyze-match.mjs --match-id <ID> --hero "Keeper of the Light" --output-dir ./output
node scripts/analyze-match.mjs --match-id <ID> --slot 7 --output-dir ./output
node scripts/recent-matches.mjs --account-id <ID | Steam64 | profile link> [--limit 10]
```

Wrappers: `./scripts/analyze-match.sh <match> <account | profile link | slot=N | "Hero Name"> [options]` and, on Windows, `.\scripts\analyze-match.ps1 -MatchId <match> -AccountId <id> | -Hero <name> | -Slot <n> [-OutputDir dir] [-HistoryDir dir]`.

Options: `--output-dir`, `--history-dir` (personal progress, see [progress](progress.md)), `--parse-timeout-ms` (default 120000), `--at mm:ss` (indexes the evidence around one moment). If an account and a hero or slot are both given, they must name the same player.

## Timing

A parsed match takes about 10 seconds. An unparsed one makes OpenDota parse the replay first: usually 15–60 seconds, up to the parse timeout. **Run the command in the background or with a timeout of at least 300000 ms**; the artifact is written only at the end. When the parse is still running at the timeout, stdout prints `opendota: ready (parse: timeout)` and a `hint:`; the artifact then has the scoreboard only. Tell the player that the replay is still being parsed and offer a rerun in 5–10 minutes.

OpenDota's free tier allows 60 requests a minute; one run uses up to about 30. The runtime retries a rate limit or a server error twice. With several matches, leave a minute between runs, or set `OPENDOTA_API_KEY`.

## Keys

Both optional, set in the environment or a secret manager, never pasted into chat, the repository or an artifact.

- `STRATZ_API_KEY` adds STRATZ playback (positions, nearby heroes, item and ability uses, teleports, full death contexts), the STRATZ lane result and peer means. Without it, deaths, lane numbers, percentiles and all-player items still come from OpenDota.
- `OPENDOTA_API_KEY` raises the OpenDota rate limit and polls a parse faster.

Behind a proxy, set `HTTPS_PROXY`; the runtime restarts itself once with Node's proxy support switched on.

## Errors

stderr prints `error: <code>` and a `hint:` line. Tell the player the meaning, not the code.

| Code | Exit | Tell the player |
| --- | --- | --- |
| `invalid_arguments` | 2 | which match and which player to analyse are needed |
| `account_vanity_unsupported` | 2 | a custom Steam URL can't be read; ask for the numeric ID or a Dotabuff link |
| `account_not_found`, `hero_not_in_match`, `slot_empty` | 2 | that player isn't in this match; check the match or the player |
| `hero_not_found`, `hero_ambiguous` | 2 | use the exact English hero name |
| `selector_conflict` | 2 | the account and the hero point at different players |
| `match_not_found` | 3 | OpenDota doesn't know this match ID; check it, or wait a few minutes after the game |
| `source_rate_limited` | 4 | OpenDota is rate-limiting; try again in a minute |
| `source_unreachable` | 4 | OpenDota can't be reached from here (network or proxy) |
| `no_usable_source_data` | 4 | no source returned the match; try again later |
| `patch_unverified` | 4 | the current patch couldn't be confirmed; try again later |
| `unsupported_patch` | 4 | the match is from an earlier patch; this coach reviews only current-patch matches, so ask for a recent one |
| `runtime_error` | 4 | something unexpected failed; nothing was written |

## Artifact (schema 2.4.0)

Check first: `sources` (with `opendota.parse.state`), `warnings`, `dataQuality.capabilities`, nulls. Then:

- `request` and `player`: the selected slot (0–9), account (may be null), hero, side, position, lane, roaming flag, result, K/D/A.
- `match`: duration, mode and lobby, `modeClass` (`standard`, `turbo`, `non_standard`, `unknown`) and `abandons` (players with OpenDota leaver status 2 or more).
- `players`: all ten: K/D/A, last hits and denies, GPM and XPM, net worth, hero and tower damage, healing, level, final items, neutral item, the first purchase of each item worth 1400+ gold (`majorItems`), and cumulative values at 10:00 (`minute10`: last hits, denies, earned gold, XP, net worth, lane efficiency).
- `lane`: the selected lane, its `allies` and `opponents`, the lane source; `outcome` and `selectedSideOutcome` only with STRATZ. Describe a lane result from `selectedSideOutcome`.
- `deathAnalysis`: every death (see [death analysis](death-analysis.md)), `byKiller`, `timelineSource`, `unresolvedCount`, patterns and the priority death.
- `percentiles`: OpenDota's percentile of the player's whole-match rates against the same hero (see [source policy](source-policy.md#comparisons)).
- `baseline`: STRATZ peer means with sample sizes, only in standard modes with a token.
- `phases`: four intervals (lane 0–10, transition 10–15, midgame 15–25, closing 25–end; clock intervals only in Turbo and non-standard modes) with interval aggregates and per-minute rates. Pre-horn events belong to the first interval. `minuteSeriesEnd` marks a final interval whose gold and XP stop at the last whole minute.
- `series`: the player's per-minute cumulative values (`values[m]` at minute m); gold is earned gold, not net worth.
- `teamEconomy`, `objectives`, `wards`, `buybacks`, `skillBuild`: recorded match context from the parsed replay.
- `items`: the player's purchases with times (pre-horn purchases are negative) and the final inventory.
- `mechanics`: Valve datafeed texts and numbers for the current patch: the selected hero, the other heroes' abilities, and up to 30 items (the player's inventory, items that killed the player, the player's other purchases, then the enemies' items). `partial` when some were left out.
- `progress`: only with `--history-dir`.

The Markdown inventory shows the same facts as tables. Neither file is the player-facing review.

# Match analysis runtime

This runtime collects a reproducible **evidence inventory** for a match before the coaching review is written. It needs Node.js 18+ and network access; `npm install` and third-party packages are not required.

## Preparing STRATZ

`STRATZ_API_KEY` opens STRATZ as an additional source. Never paste the token into chat, Markdown, shell history, artifacts or the repository. Set it only for the current session, or through a secret manager or CI.

Windows PowerShell (input hidden):

```powershell
$secureToken = Read-Host -AsSecureString 'STRATZ_API_KEY'
$env:STRATZ_API_KEY = [System.Net.NetworkCredential]::new('', $secureToken).Password
Remove-Variable secureToken
```

macOS and Linux Bash (input hidden; run this setup snippet in Bash):

```sh
read -r -s -p 'STRATZ_API_KEY: ' runtime_token; printf '\n'
export STRATZ_API_KEY="$runtime_token"
unset runtime_token
```

`scripts/analyze-match.sh` itself stays a portable `/bin/sh` wrapper; Bash is needed only for the hidden token input above.

Without the variable the runtime makes no STRATZ request and records `sources.stratz.status: "unavailable"` with the reason `"missing_token"`. That does not invalidate the available OpenDota data. The final answer must offer to connect STRATZ for position, lane and playback enrichment, name exactly which data is unavailable, and continue the permitted OpenDota review in degraded mode. Never ask for the token in chat.

The runtime collects the peer baseline with a second request to STRATZ `heroStats.stats`. The leaderboard of strong players and the self-baseline are still not collected, so the token alone does not guarantee `baseline_ready`.

## Running it

A positive integer `match_id` and a player selector are required: a positive integer `account_id`, or the exact English hero name. Run it from the root of the skill bundle. If both selectors are given, they must point at the same player.

Windows PowerShell wrapper:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500 --parse-timeout-ms 120000 --output-dir .\output
```

Windows, someone else's match by hero:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8963363814 -Hero 'Earth Spirit' --parse-timeout-ms 120000 --output-dir .\output
```

macOS and Linux POSIX wrapper:

```sh
./scripts/analyze-match.sh 8963363814 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

macOS and Linux, someone else's match by hero:

```sh
./scripts/analyze-match.sh 8963363814 'Earth Spirit' --parse-timeout-ms 120000 --output-dir ./output
```

Direct Node call (any platform with Node.js 18+):

```sh
node scripts/analyze-match.mjs --match-id 8963363814 --account-id 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

`--hero 'Earth Spirit'` may be passed instead of `--account-id`.

Arguments:

| Argument | Required | Default | Meaning |
| --- | --- | --- | --- |
| `--match-id` / `-MatchId` / first argument of the shell wrapper | yes | — | Dota 2 match ID |
| `--account-id` / `-AccountId` / numeric second argument of the shell wrapper | one of the two | — | Steam account ID of the analysed player |
| `--hero` / `-Hero` / textual second argument of the shell wrapper | one of the two | — | Exact English hero name; used for someone else's match with no known account ID |
| `--parse-timeout-ms` | no | `120000` | Total wait limit for the OpenDota parse job, in milliseconds |
| `--output-dir` | no | `<skill-root>/output` | Directory for the normalized artifacts |

On success stdout shows the `opendota`, `valve` and `stratz` statuses, then the `json` and `markdown` paths. With the default directory those are `output/<match_id>.json` and `output/<match_id>.md`.

## The artifacts and what they mean

The JSON is the normalized evidence model; the Markdown is its deterministic, readable rendering. Top level of the JSON:

```text
schemaVersion, generatedAt, request, sources, match, player, draft, lane,
summary, items, events, series, patch, phases, baseline, eventInventory,
dataQuality, warnings
```

`draft.radiant` and `draft.dire` hold the sides separately; `draft_ready` opens only with five distinct heroes on each side. `events` holds a compact allowlisted timeline of the selected player from STRATZ, validated OpenDota `teamfights` with a `source` on every record, and the derived `repositions` described below. The boolean `eventInventory` does not open `event_ready` by itself: usable events with timecodes must survive into the written artifact. `summary`, `items`, `series` and `phases` hold the final metrics, the final inventory and purchases, the source rows and the phase deltas and extremes. Material disagreements between sources are kept as `candidates` with provenance and a warning.

### Repositions

`events.repositions` is a derived row: jumps in the player's position row, each labelled with its cause. A jump is an interval where the distance travelled is at least 15 minimap cells and the speed is at least 6 cells per second: on foot, at the 550 movement speed cap, the maximum is about 4.3 cells per second, so running never enters the row. Respawns are discarded, because a death lies between the two points of such an interval.

`cause` takes three values. `teleport_item` means the player used a town portal scroll or Boots of Travel near the arrival, and the id is in `causeItemId`. `ally_warp` means the player stepped into an ally's warp themselves, for example Underlord's Dark Rift, and the ability id is in `causeAbilityId`. `unattributed` means there is no cast of the player's own nearby.

Limits that must be named in the answer:

- The cause is searched only among the player's **own** casts within 15 seconds before the arrival. A relocation applied to the player by someone else's ability — Io's Relocate, Chen's teleport — stays `unattributed`, because the player casts nothing at that moment.
- The source does not always emit a Boots of Travel use, so some genuine teleports also land in `unattributed`.
- `unattributed` means "the method of entry is unknown", not "the player teleported". Such a jump may not be called a teleport, and no assessment of the decision to enter may be built on it.
- `ally_warp` is an entry together with the team's initiation. The complaint "went in alone by teleport" does not apply to it.

Rank is stored in two different fields and they must not be confused. `player.rank` is the player's own medal: OpenDota `rank_tier` and STRATZ `steamAccount.seasonRank`. `match.averageRank` is the match average bracket from STRATZ `match.rank`. In a mixed lobby they diverge by several buckets: in match 8963443105 the player was `42` (Archon 2) with an average of `60` (Ancient).

Both fields hold the raw two-digit code and a human-readable `label`: tens are the medal (`Herald` to `Immortal`), units are the star. `60` is `Ancient`, `42` is `Archon 2`, `80` is `Immortal`. An unknown code leaves `label: null` and prints in Markdown as an unknown label; never invent a medal for an unfamiliar code.

The player's medal is a snapshot of the profile at collection time, not the rank at the time of the match: no source gives that. When OpenDota and STRATZ give different codes, the runtime picks no winner: `player.rank.value` stays `null` with `candidates`, and the bracket falls back to the match average bracket. Rank by itself is not a baseline.

### Baseline

`baseline` is a normative sample of the same hero, position and bracket on the current patch. It is collected with a second request to STRATZ `heroStats.stats` after normalization, because the selectors are known only from there. A baseline refusal never cancels the other facts of the match.

`baseline.sameHeroPositionRankPatch` describes the sample: `heroId`, `position`, `bracket` with a human-readable `bracketLabel` and `bracketSource`, `rankCode`, `patch`, the list of `weeks`, and `points` — cumulative means at the selected minutes, each with its own `matchCount`. `baseline.comparisons` holds ready comparison rows: `metric`, `minute`, `player`, `baseline`, `delta`, `ratio`, `matchCount` and `crossSourceProxy`.

Limits that must be named in the answer:

- `statistic` is always `mean`. The source gives no percentiles, so "you are in the bottom 30 per cent" cannot be said — only a ratio to the mean.
- The bracket is coarse, four buckets: `HERALD_GUARDIAN`, `CRUSADER_ARCHON`, `LEGEND_ANCIENT`, `DIVINE_IMMORTAL`.
- The patch is filtered by weeks. Only weeks lying entirely inside the current patch are taken, at most the last six; a week crossing the patch boundary is discarded whole.
- A minute enters the sample only with a `matchCount` of at least 200, and `matchCount` naturally falls towards later minutes: a comparison at minute 50 is conditioned on the match having lived that long.
- There is no net worth comparison here. OpenDota `gold_t` is accumulated gold, not net worth: in match 8963443105 the last point of the row is 12772 while `net_worth` is 11150, and the proxy systematically inflated the player against the `networth` baseline. No runtime source gives a comparable per-minute net worth row, so the row was removed. The `crossSourceProxy` flag stays in the schema for future rows and is currently set by none; the final `summary.netWorth` is read from `net_worth`, not from `total_gold`.

`bracketSource` names what the bucket stands on: `player_medal` is the player's own medal, `match_average` is the match average bracket, used when the medal is unknown or the sources disagree about it. `rankCode` next to it holds the code the bucket was actually chosen by. A `match_average` row must always carry a caveat in the review: the sample may sit above or below the player's own level.

Possible `baseline.reason` values with the gate closed: `not_requested`, `missing_token`, `hero_unknown`, `position_unknown`, `rank_unknown`, `no_full_week_in_current_patch`, `empty_sample`, `no_comparable_point`. With `status: "failed"` the reason is replaced by a safe `error.code`.

`match.gameMode` and `match.lobbyType` arrive in different vocabularies: OpenDota gives Valve numbers, STRATZ gives strings from its own enums. The runtime reduces them to the numeric Valve id and prints a human-readable `label` (`22` and `ALL_PICK_RANKED` are the same `All Draft` mode, `0` and `UNRANKED` the same lobby type). The tables cover game mode 0-24 and lobby type 0-9, where the vocabularies agree. A value outside the table is not declared a source conflict: the field stays `null` with `candidates`, and the warning reads `outside the known vocabulary`. A genuine mode disagreement still produces a `conflict` warning.

`sources` holds `opendota`, `stratz` and `valve`. Each source has a `status` (`ready`, `unavailable`, `failed` or `not_found`) and, where applicable, safe `reason`, `error.code` and `parse` (`requested`, `state`). For OpenDota the parse state may be `not_requested`, `requested`, `completed`, `timeout`, `unavailable`, `failed` or `error`.

Read and record `sources` and `dataQuality.gates` before any interpretation. The gates have exact names:

| Gate | Permits |
| --- | --- |
| `scoreboard` | facts of the result and the match line |
| `phase_aggregates` | comparison of the observed phases inside the match |
| `draft_ready` | the full draft and the draft context |
| `event_ready` | the event timeline and analysis of a specific episode |
| `baseline_ready` | normative comparison against the hero + position + bracket sample on the current patch |
| `current_patch` | analysis within the supported exact current sub-patch |

`dataQuality.mode: "degraded"`, `missing`, or a closed gate limit the conclusions per the [review contract](review-template.md); never fill closed slots with guesses.

The evidence Markdown is **not** the final coaching answer. It lists facts, statuses, metrics, gates and missing data. The final answer is written separately, following `SKILL.md` and the [review contract](review-template.md): only after checking the artifact, only with conclusions the gates permit, and with explicit confidence and alternatives where they are required.

## Errors and safe recovery

| Observation | Meaning | Safe action |
| --- | --- | --- |
| `parse.state: "timeout"` or `error.code: "parse_timeout"` | OpenDota did not finish the parse before the limit | Keep the degraded status; rerun the same request later or raise `--parse-timeout-ms`. Never invent replay-derived events. |
| `parse.state: "unavailable"` or a failed parse | The parse job was not issued or finished without the needed rows | Use only the gates actually open; never substitute zeros for missing events. |
| `sources.stratz` = `unavailable/missing_token` | The token is not set | Analyse the available OpenDota evidence in degraded mode; never claim STRATZ enrichment. |
| `error.code: "auth"` (HTTP 401/403) | The token is missing, wrong or lacks access | Check the secret manager or the variable in the current session and the token's rights; never print it for diagnosis. |
| `error.code: "invalid_response"` with HTML or Cloudflare | The API returned something other than JSON, often a challenge or proxy page | Do not parse the HTML and do not bypass the challenge; retry later from a permitted network or use the available sources. |
| `error.code: "rate_limited"` (HTTP 429) | A temporary source limit | Wait and run the request later. Do not retry aggressively in parallel. |
| `error.code: "network"`, `"timeout"` or `"http"` | A temporary network or server error | Keep the source status, retry later and leave the corresponding gates closed. STRATZ periodically returns `503` on a heavy match request with quota left, so one such refusal is not a sign of a wrong token. |
| `error: patch_unverified` | The Valve timeline is unavailable or the exact patch is not confirmed | The runtime exited with code `4` and wrote no success artifact; retry once the timeline is back. |
| `error: unsupported_patch` | The match does not belong to the latest exact sub-patch | The runtime exited with code `4` and wrote no success artifact; this match is out of scope for the first version. |

Process exit codes:

| Code | Meaning |
| --- | --- |
| `0` | The normalized evidence artifact was written |
| `2` | Invalid arguments, or the player was not found or is ambiguous |
| `3` | The match was not found |
| `4` | Another runtime or data error, including no usable source and an unverified or old exact patch |

Only normalized JSON and Markdown reach the artifacts, deliberately. The runtime stores no raw API responses, HTTP headers or tokens; never add such data by hand while debugging.

Safe player-selector errors: `hero_not_found`, `hero_ambiguous`, `hero_account_unavailable`, `hero_lookup_unavailable` and `selector_conflict`; all return exit code `2` without printing raw responses.

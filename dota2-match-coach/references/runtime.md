# Match-analysis runtime

The runtime creates a reproducible normalized evidence artifact before the coaching review. It needs Node.js 18+ and network access; no packages must be installed. The artifact is evidence, not an automatic coaching answer.

## STRATZ token

`STRATZ_API_KEY` is optional enrichment. Set it through the current session or a secret manager; never paste it into chat, the repository, a command log, or an artifact. Without it, OpenDota facts can still be reviewed in degraded mode while STRATZ-dependent facts stay unavailable.

```powershell
$secureToken = Read-Host -AsSecureString 'STRATZ_API_KEY'
$env:STRATZ_API_KEY = [System.Net.NetworkCredential]::new('', $secureToken).Password
Remove-Variable secureToken
```

## Run from the skill root

Windows PowerShell uses named parameters:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8970339828 -Hero 'Keeper of the Light' -ParseTimeoutMs 120000 -OutputDir .\output
.\scripts\analyze-match.ps1 -MatchId 8970339828 -AccountId 123456 -ParseTimeoutMs 120000 -OutputDir .\output
```

The shell wrapper remains positional on macOS/Linux:

```sh
./scripts/analyze-match.sh 8970339828 123456 --parse-timeout-ms 120000 --output-dir ./output
```

An account ID or exact English hero name is required. If both are passed, they must resolve to the same participant. Hero-only selection is for a player whose account is not known; it does not establish that the match belongs to the requester.

## Optional personal history

To compare with earlier saved analyses, pass `--history-dir` to the shell/Node entrypoint, or `-HistoryDir` to PowerShell. The directory may also be the output directory: the current match and duplicate matches are excluded before writing the new result.

```sh
./scripts/analyze-match.sh 8970339828 123456 --history-dir ./output --output-dir ./output
```

```powershell
.\scripts\analyze-match.ps1 -MatchId 8970339828 -AccountId 123456 -HistoryDir .\output -OutputDir .\output
```

History is optional and local. A missing or unreadable directory leaves the match review available with an unavailable progress result and a safe reason. Only prior matches on the same account, hero, position, game mode, and currently verified exact patch can contribute. See [personal progress](progress.md) for interpretation and minimum samples.

## Opt-in live release smoke

The repository contains no saved live match, account, hero, or token. To run the smoke, select a fresh public match from the current exact subpatch, then set its match ID and either its account ID or exact English hero name only in the current shell session:

```powershell
$env:DOTA2_COACH_LIVE_MATCH_ID = '<fresh current-subpatch match id>'
$env:DOTA2_COACH_LIVE_ACCOUNT_ID = '<participant account id>'
# Only when no account ID is known:
# $env:DOTA2_COACH_LIVE_HERO = '<exact English hero name>'
node --test scripts/test/live-smoke.test.mjs
```

The test has a 180-second timeout and skips safely when the live match ID or selector is absent. If both selector variables happen to be set, it intentionally uses the account ID and ignores the hero value, preventing a stale hero value from creating a selector conflict. Remove all three selector variables after the run; do not write their values into a file, artifact, commit, or chat transcript.

```powershell
Remove-Item Env:DOTA2_COACH_LIVE_MATCH_ID -ErrorAction SilentlyContinue
Remove-Item Env:DOTA2_COACH_LIVE_ACCOUNT_ID -ErrorAction SilentlyContinue
Remove-Item Env:DOTA2_COACH_LIVE_HERO -ErrorAction SilentlyContinue
```

Without `STRATZ_API_KEY`, an account-based current-patch smoke is still useful as a degraded gate: it proves the live source path, exact-patch guard, schema `2.3.0`, ten participant slots, and death accounting. It does not prove STRATZ-only playback, death contexts, or peer baseline. The full release gate requires one additional fresh current-subpatch smoke with a session-only STRATZ token, followed by the two Windows wrapper commands (account and hero selectors) against the same match. Neither gate permits old or historical patches.

## Read the v2 artifact

The successful JSON has `schemaVersion: "2.3.0"`. Inspect these sections before writing a review:

- `sources`, `warnings`, and `dataQuality.capabilities`: what source evidence exists and which classes of conclusion are supported;
- `participants`: ten deterministic match slots with `{ id, name }` hero references, side, position, lane, role, rank, and playback availability; unknown values remain `null`;
- `lane`: selected lane, verified physical opponents, and a safe unknown reason when no matchup can be established. `outcome` is STRATZ's own label for that physical lane, named from the Radiant and Dire sides (for example `DIRE_VICTORY`); the runtime does not recompute it. It is `null` without STRATZ, for an unplaced lane such as roaming, or on a source conflict. `selectedSideOutcome` restates it from the selected side as `won_by_stomp`, `won`, `tie`, `lost` or `lost_by_stomp`, and is `null` when the outcome or the side is unknown. Describe the lane result from `selectedSideOutcome`, never by reading the side into the raw label;
- `items`: recorded purchases with time and source, and the final inventory. Starting items are bought before the horn and carry negative times; purchases are kept from 300 seconds before the horn, while every other event family starts at zero;
- `deathAnalysis`: every selected-player death context, confirmed observations, unavailable prerequisites, same-match patterns, and priority death time;
- `series`: the selected player's per-minute OpenDota values, where `values[m]` is the value at minute `m`. `minuteBasis` records whether minutes come from the replay's recorded sample times or, only when none were recorded, from array position. `netWorth` is present only when the parse recorded per-minute net worth; cumulative `gold` is collected gold, not net worth.
- `teamEconomy`: per-minute team earned-gold and XP difference, and net worth difference when all ten participants recorded it, from the selected side's perspective (positive means the selected side is ahead), with per-phase changes, extremes, leader changes and the largest change within `swingWindowMinutes`. Earned gold is total gold earned, not net worth.
- `objectives`: recorded building, Roshan, Aegis, Tormentor, first-blood and courier events with time, side, the recorded last hit and whether the selected player is involved; `unrecognizedCount` counts records the runtime could not place on the match clock or classify.
- `wards`: the selected player's observer and sentry placements with the time each ward left the game, placements without a usable match time, and side totals when all five players' logs exist.
- `buybacks`: the selected player's buyback times and side totals when all five players' logs exist.
- `skillBuild`: the recorded ability and talent upgrade order.
- `mechanics`: Valve datafeed values for the current exact patch: the selected hero's attributes, abilities with resolved descriptions, cooldowns, mana costs, listed values, Aghanim's texts and talents; the other match heroes' abilities; the selected player's purchased items without recipes, at most 30 per run with the final inventory first and then the costliest purchases; and current sub-patch notes for those entities. `status` is `partial` when some records failed or were left out by the item limit, and `unavailable` without the selected hero; `unavailable[]` names each missing record, with the reason `item_limit` for an item left out. Names from the datafeed also replace community constant names across the artifact.
- `baseline`: ready peer-mean comparisons with metric, minute, sample size, and bracket basis.
- `baseline.sameHeroPositionRankPatch.points[].metricSampleSizes`: the observed sample size per source metric; each comparison's `matchCount` uses that metric's own sample size. Death comparisons require a complete, consistent event count; missing events do not become zero.
- `baseline.sameHeroPositionRankPatch.weeks`: epoch-week indices, not calendar week numbers; a week starts at `index * 604800` Unix seconds. The runtime includes only complete weeks inside the verified current patch.
- `progress`, when history was requested: selected prior matches, per-metric means and sample sizes, observed death-condition shares, and history-loading limits. This is a descriptive personal reference, separate from peer baseline.

The deterministic Markdown next to the JSON is an evidence inventory. It may name sources and missing data, but it is not the final player-facing review. Follow the source policy, death policy, decision stack, and review contract after inspecting the JSON.

## Safe results and errors

Only normalized JSON and Markdown are written. Raw responses, headers, and secrets never are. On an unavailable replay, missing token, rate limit, or network failure, use only the available facts; do not replace missing events with zeros. An old exact patch or unverified current patch exits without a success artifact. The runtime’s safe player-selector errors include an ambiguous hero and a hero/account conflict; correct the selector rather than guessing.

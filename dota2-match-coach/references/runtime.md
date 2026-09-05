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

Without `STRATZ_API_KEY`, an account-based current-patch smoke is still useful as a degraded gate: it proves the live source path, exact-patch guard, schema `2.0.0`, ten participant slots, and death accounting. It does not prove STRATZ-only playback, death contexts, or peer baseline. The full release gate requires one additional fresh current-subpatch smoke with a session-only STRATZ token, followed by the two Windows wrapper commands (account and hero selectors) against the same match. Neither gate permits old or historical patches.

## Read the v2 artifact

The successful JSON has `schemaVersion: "2.0.0"`. Inspect these sections before writing a review:

- `sources`, `warnings`, and `dataQuality.capabilities`: what source evidence exists and which classes of conclusion are supported;
- `participants`: ten deterministic match slots with `{ id, name }` hero references, side, position, lane, role, rank, and playback availability; unknown values remain `null`;
- `lane`: selected lane, verified physical opponents, and a safe unknown reason when no matchup can be established;
- `deathAnalysis`: every selected-player death context, confirmed observations, unavailable prerequisites, same-match patterns, and priority death time;
- `baseline`: ready peer-mean comparisons with metric, minute, sample size, and bracket basis.

The deterministic Markdown next to the JSON is an evidence inventory. It may name sources and missing data, but it is not the final player-facing review. Follow the source policy, death policy, decision stack, and review contract after inspecting the JSON.

## Safe results and errors

Only normalized JSON and Markdown are written. Raw responses, headers, and secrets never are. On an unavailable replay, missing token, rate limit, or network failure, use only the available facts; do not replace missing events with zeros. An old exact patch or unverified current patch exits without a success artifact. The runtime’s safe player-selector errors include an ambiguous hero and a hero/account conflict; correct the selector rather than guessing.

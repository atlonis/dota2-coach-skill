# Match data retrieval runtime for Dota 2 Match Coach

Date: 25 August 2026
Status: design approved in chat, awaiting a document review before implementation

## Goal

Add to the `dota2-match-coach` bundle a self-contained cross-platform runtime that, given a `match_id` and a player selector (`account_id` or the exact English hero name), fetches the available OpenDota and STRATZ data, normalizes it and produces an evidence foundation for the coaching review.

The runtime runs on Node.js 18+ with no npm packages. On macOS and Linux a shell wrapper launches it, on Windows a PowerShell wrapper. All HTTP, GraphQL and JSON logic lives in shared `.mjs` modules.

## User contract

The main commands:

```bash
./dota2-match-coach/scripts/analyze-match.sh 8963363814 56386500
```

```powershell
./dota2-match-coach/scripts/analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500
```

A direct cross-platform call:

```text
node dota2-match-coach/scripts/analyze-match.mjs --match-id 8963363814 --account-id 56386500
```

A successful run prints a short summary and creates:

- `output/<match_id>.json` — the normalized evidence;
- `output/<match_id>.md` — a deterministic summary of the available facts and limits for the coaching answer that follows.

Raw API responses and the STRATZ token are never written to disk.

## Scope of the first runtime version

### In scope

- the OpenDota match endpoint and the parse-first workflow;
- requesting a parse when the replay-derived fields are missing;
- a bounded wait for the parse job with a configurable timeout;
- STRATZ GraphQL enrichment with the exact `User-Agent: STRATZ_API`;
- identifying the player by `account_id` or by the exact English hero name; with both selectors, a mandatory cross-check;
- teams, the full draft, role and position, and lane outcome when the sources return them;
- final metrics, time series, purchases, kills and deaths, teamfights and the available playback and event data;
- splitting the time series into `0-10`, `10-15`, `15-25`, `25+`;
- an explicit data sufficiency level and a list of the missing context;
- degraded mode when sources are partially unavailable.

### Out of scope

- downloading and parsing a raw `.dem` ourselves;
- reconstructing every creep, its HP and every input opportunity;
- an LLM call from the runtime;
- storing the STRATZ token in project files;
- installing the skill globally;
- analysing matches that are not on the current exact sub-patch.

## Architecture

```text
shell / PowerShell wrapper
          |
          v
analyze-match.mjs
  |-- lib/opendota.mjs  -> match, parse request, job polling
  |-- lib/stratz.mjs    -> GraphQL enrichment
  |-- lib/normalize.mjs -> canonical evidence model and data gates
  |-- lib/report.mjs    -> deterministic Markdown summary
  `-- output/<match_id>.{json,md}
```

The files live inside `dota2-match-coach/scripts/`. The tests live in `dota2-match-coach/test/` and use the built-in `node:test` with a stubbed `fetch`.

## Data flow

1. The CLI validates a positive integer `match_id` and accepts an `account_id` or the exact English hero name. For a hero name the runtime loads the OpenDota hero constants and resolves only a single participant of the match; ambiguity, a hidden account ID and a conflict between two selectors all end in a safe error.
2. OpenDota loads the match object.
3. The parse state is determined from `version` and the required replay-derived fields, not from the presence of `players` alone.
4. When the data is missing, the runtime sends a parse request, polls the job until a terminal state or a timeout, and loads the match again.
5. Once the basic match is in hand, the runtime queries STRATZ. Headers: `Authorization: Bearer <STRATZ_API_KEY>`, `Content-Type: application/json`, `User-Agent: STRATZ_API`.
6. A missing token means `stratz.status = unavailable`, not a failure of the whole run.
7. The normalizer merges the sources, keeping the provenance of every field and never substituting guesses for missing values.
8. The data gate is determined: `scoreboard`, `phase_aggregates`, `baseline_ready`, `draft_ready`, `event_ready` or the available combination.
9. The JSON is written atomically. The Markdown is built only from the normalized model.

## Normalized model

Top level:

```text
schemaVersion
generatedAt
request { matchId, accountId }
sources { opendota, stratz }
match { result, duration, startTime, gameMode, lobbyType, patch }
player { accountId, heroId, side, position, lane, rank }
draft { radiant, dire, complete }
lane { opponentHeroIds, outcome, efficiency }
summary { kda, lh, denies, gpm, xpm, netWorth, heroDamage, towerDamage, healing }
items { purchases, finalInventory }
events { kills, deaths, teamfights, runes, objectives, abilityUses, positions }
series { gold, xp, lh, denies }
phases[] { interval, metrics, extremaWithinMatch }
dataQuality { mode, gates, missing, warnings }
```

Every merged or disputed field carries a `source` or stays `null`. Closed STRATZ estimates such as IMP are kept as an auxiliary signal but never decide a conclusion.

## Source policy

- OpenDota is the primary source of the match object, the parse job and the open replay-derived events.
- STRATZ provides role and position, lane outcome, the full line-up and the available playback and enrichment.
- When values conflict, the runtime keeps both values with provenance plus a warning; it never silently picks the convenient one.
- The runtime does not use Dota2ProTracker, Fandom or Valve `GetMatchDetails`.
- Verifying the current exact sub-patch uses the official Valve patch timeline. When the timeline is unavailable, the patch gate stays closed and the report explicitly makes no current-patch normative conclusions.

## Errors and degraded mode

Source errors are normalized into safe codes: `network`, `http`, `rate_limited`, `auth`, `graphql`, `invalid_response`, `not_found`, `parse_timeout`, `replay_unavailable`.

- An OpenDota `404` ends the run as `match_not_found`.
- The OpenDota rate limit honours `Retry-After` but never waits past the overall timeout.
- A STRATZ `401` or `403` is marked separately; HTML and Cloudflare pages are not parsed as JSON.
- An unavailable STRATZ does not prevent an OpenDota-only report.
- An unparsed and no longer available replay yields a scoreboard or aggregate-only report with the event gates closed.
- No handler ever prints the Authorization header or the token.

## Security and reproducibility

- The token is read only from `STRATZ_API_KEY`.
- The CLI does not accept the token as an argument, so it never lands in shell history.
- Writing the result uses a temporary file next to the target plus a rename.
- `generatedAt`, the source statuses and the schema version make the boundaries of a specific report reproducible.
- Test fixtures are synthetic and contain no user secrets.

## TDD and verification

The implementation is test-first through the built-in `node:test`:

1. CLI validation and identical argument passing from both wrappers.
2. OpenDota: already parsed, request-and-poll, timeout, unavailable replay, rate limit.
3. STRATZ: the mandatory exact User-Agent, the Bearer token, GraphQL, HTML and HTTP errors, and a missing token.
4. Normalization: finding the account, provenance, value conflicts, the four phases, extrema, data gates.
5. Report: aggregate-only does not turn correlation into a cause and lists the missing data.
6. An offline integration test of the full orchestration with a mock fetch.
7. A live run on `8963363814` and `56386500` without storing raw API responses.

Definition of done: all offline tests pass; the live run creates valid JSON and Markdown, finds the right player, reports the status of both sources and never discloses the token.

## Changes to the skill bundle

- `SKILL.md` gains a mandatory runtime call before a review by match ID and a link to the CLI reference.
- `references/source-policy.md` gains the exact runtime contract and the degraded mode rules.
- a new `references/runtime.md` documents the commands, the output schema and troubleshooting.
- the generated `output/` stays a local working artifact and is not part of the skill instructions.

# Dota 2 Match Coach

[English](README.md) | [Русский](README.ru.md)

An evidence-based agent skill for reviewing a current-patch Dota 2 match by `match_id`. Select the player by `account_id` or by their hero's exact English name. Before coaching interpretation, the bundled runtime collects OpenDota, STRATZ, and the official Valve patch timeline, normalizes the evidence with provenance, and opens only conclusions supported by the available data gates.

The project targets only the latest exact subpatch. Older matches or matches that cannot be verified against the Valve timeline do not produce a success artifact.

## Features

- OpenDota parse-first collection with scoreboard fallback when replay data is unavailable;
- STRATZ GraphQL enrichment with the required `User-Agent: STRATZ_API`;
- latest exact-subpatch verification through the Valve timeline;
- Radiant/Dire draft, lane outcome, final metrics, purchases, and inventory;
- four game stages, time series, and within-match extrema, with every per-minute value keyed by the replay's recorded sample time;
- team earned-gold, XP and, when recorded, net worth difference per minute, with per-stage changes, leader changes and the largest swings;
- recorded objectives (buildings, Roshan, Aegis, Tormentor, first blood, couriers), ward placements, buybacks, and the skill build;
- allowlisted event timeline and teamfights bounded by match duration;
- position jumps labelled with their cause, so an ally warp is never read as a solo teleport;
- explicit source conflicts with alternatives and provenance preserved;
- deterministic JSON/Markdown artifacts and safe CLI errors;
- dependency-free PowerShell and POSIX wrappers;
- player selection by exact English hero name for reviewing someone else's match;
- automatic Russian or English user-facing reviews based on the user's language.
- full, brief, and focused reviews with one exercise linked to the main finding;
- optional personal progress from comparable saved matches on the current exact patch;
- peer comparisons protected against incomplete death timelines and metric-specific missing samples.

Deep raw `.dem` analysis is intentionally outside runtime v1: without it, the skill cannot reliably explain every input or missed creep. The baseline runtime collects is a peer sample — same hero, position and bracket on the current patch — reported as a mean with its sample size, not as a percentile.

The statistical draft model, stronger peer distributions and strong-player baselines, and deep `.dem` analysis are tracked in [ROADMAP.md](ROADMAP.md). Personal progress from saved normalized matches is available now.

## Requirements

- Node.js 18+;
- network access to OpenDota, STRATZ, and Valve;
- PowerShell on Windows or POSIX `sh` on macOS/Linux;
- recommended `STRATZ_API_KEY` for STRATZ position/lane/playback enrichment.

No `npm install` or `package.json` is required.

## Install

Install globally with [Vercel Skills](https://github.com/vercel-labs/skills). The CLI will let you choose which detected agent or agents should receive the skill:

```sh
npx skills add atlonis/dota2-coach-skill --skill dota2-match-coach --global --copy
```

Verify the installation:

```sh
npx skills list --global
```

Open a new session in the agent where you installed the skill and ask:

```text
Use $dota2-match-coach to analyze match 8963363814 for account_id 56386500.
```

To review someone else's match, select the player by hero:

```text
Use $dota2-match-coach to analyze the Earth Spirit player in match 8963363814.
```

The skill chooses the platform runtime, gathers data, and checks independent data capabilities before starting the review. Set `STRATZ_API_KEY` in the environment of your chosen agent for richer position/lane/playback data. A token is also required for the peer baseline, though it does not guarantee one: the position and a rank must be known — the player's own medal, or the match average bracket as a fallback and at least one full week must fall inside the current patch. See the [runtime contract](dota2-match-coach/references/runtime.md) for token setup, schema, exit codes, and troubleshooting. Never place the token in prompts, commands, repository files, or Git.

## Language

The complete user-facing review follows the user's language: a Russian request produces Russian output and an English request produces English output. An explicit language instruction overrides detection; mixed-language conversations follow the last substantive user message.

Headings, the stage table, data limits, source notices, and the exercise are localized. Hero and item names retain their source spelling. Internal schema keys, capability names, and error codes stay in evidence artifacts rather than coaching prose.

## Review scope and progress

Ask for a full review, a brief review, or a particular topic such as items or last hits at ten minutes. The skill selects the main finding by the requested scope, evidence quality, and a useful next action. Repeated death observations do not automatically take priority over the question you asked. Practice counts are proposed plans, while normative game targets require a suitable sourced comparison.

To compare with earlier saved analyses of the same player:

```sh
./dota2-match-coach/scripts/analyze-match.sh MATCH_ID ACCOUNT_ID --history-dir ./dota2-match-coach/output --output-dir ./dota2-match-coach/output
```

PowerShell accepts `-HistoryDir` alongside its existing named options. Personal means require at least two distinct earlier matches with the same hero, position, game mode, and exact current patch, and use each metric's own observed sample count. This feature reads existing normalized JSON artifacts; it does not automatically fetch account history. Changes describe those matches and do not prove a training effect. See [personal progress](dota2-match-coach/references/progress.md).

## Update and remove

```sh
npx skills update dota2-match-coach --global --yes
npx skills remove dota2-match-coach --global
```

## Data capabilities

The runtime writes independent `dataQuality.capabilities`:

- `scoreboard` — basic match facts are available;
- `phaseAggregates` — observable stage metrics are available;
- `draft` — five Radiant and five Dire heroes are known;
- `peerBaseline` — a peer sample of the same hero, position and bracket on the current patch is available;
- `selectedTimeline` and `allPlayerPositions` — the required playback timelines are available;
- `deathContext` and `deathPattern` — complete death contexts or a repeated confirmed signature are available;
- `teamEconomy` and `objectiveTimeline` — the per-minute team difference and the recorded objectives are available;
- `wardPlacements`, `buybackLog`, and `skillBuild` — the selected player's corresponding logs are available;
- `currentPatch` — the latest exact subpatch is verified.

A false capability blocks only its corresponding conclusion. `deathPattern: false` means no confirmed repeated signature was produced; check death coverage before claiming that repetition was absent.

## Validation

From the repository root:

```sh
node --test test/runtime/*.test.mjs dota2-match-coach/scripts/test/*.test.mjs
```

The combined suite contains the repository regressions and the v2 skill tests. It needs no network access unless the opt-in live-smoke environment variables are present. Platform-specific and inactive live tests skip safely.

The final coaching answer is also evaluated through [offline consuming-agent scenarios](test/coaching/README.md), including missing replay data, zero deaths, mismatched ranks, and focused questions. These evaluations are separate from the Node test suite.

## Repository structure

```text
dota2-match-coach/          the installed skill bundle
  SKILL.md                 skill instructions
  agents/openai.yaml       OpenAI-compatible UI metadata
  references/              runtime, source policy, review template, decision stack
  scripts/                 runtime, platform wrappers, and v2 tests
test/runtime/              offline node:test suite
docs/superpowers/          design spec and implementation plan
RESEARCH.md                source and design research
ROADMAP.md                 features the data gates anticipate but the runtime does not collect yet
```

Local `output/`, secrets, and process-specific `.superpowers/` artifacts are excluded from the repository.

## Source policy

OpenDota is the primary source for the match object and parse job. STRATZ adds position/lane/playback enrichment, while Valve verifies the exact current subpatch. Dota2ProTracker, the old Fandom wiki, and Valve `GetMatchDetails` are not runtime dependencies. See the full [source policy](dota2-match-coach/references/source-policy.md).

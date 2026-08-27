# Dota 2 Match Coach — “Above Context”

[English](README.md) | [Русский](README.ru.md)

An evidence-based agent skill for reviewing a current-patch Dota 2 match by `match_id`. Select the player by `account_id` or by their hero's exact English name. Before coaching interpretation, the bundled runtime collects OpenDota, STRATZ, and the official Valve patch timeline, normalizes the evidence with provenance, and opens only conclusions supported by the available data gates.

The project targets only the latest exact subpatch. Older matches or matches that cannot be verified against the Valve timeline do not produce a success artifact.

## Features

- OpenDota parse-first collection with scoreboard fallback when replay data is unavailable;
- STRATZ GraphQL enrichment with the required `User-Agent: STRATZ_API`;
- latest exact-subpatch verification through the Valve timeline;
- Radiant/Dire draft, lane outcome, final metrics, purchases, and inventory;
- four game stages, time series, and within-match extrema;
- allowlisted event timeline and teamfights bounded by match duration;
- explicit source conflicts with alternatives and provenance preserved;
- deterministic JSON/Markdown artifacts and safe CLI errors;
- dependency-free PowerShell and POSIX wrappers;
- player selection by exact English hero name for reviewing someone else's match;
- automatic Russian or English user-facing reviews based on the user's language.

Deep raw `.dem` analysis is intentionally outside runtime v1: without it, the skill cannot reliably explain every input or missed creep. The baseline runtime collects is a peer sample — same hero, position and bracket on the current patch — reported as a mean with its sample size, not as a percentile.

The statistical draft model, the self and strong-player baselines, and deep `.dem` analysis are tracked in [ROADMAP.md](ROADMAP.md).

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

The skill chooses the platform runtime, gathers data, and checks data gates before starting the review. Set `STRATZ_API_KEY` in the environment of your chosen agent for richer position/lane/playback data. A token is also required for the peer baseline, though it does not guarantee one: the match rank and position must be known and at least one full week must fall inside the current patch. See the [runtime contract](dota2-match-coach/references/runtime.md) for token setup, schema, exit codes, and troubleshooting. Never place the token in prompts, commands, repository files, or Git.

## Language

The complete user-facing review follows the user's language: a Russian request produces Russian output and an English request produces English output. An explicit language instruction overrides detection; mixed-language conversations follow the last substantive user message.

Headings, stage reviews, data limitations, STRATZ notices, and the action plan are localized. Hero and item names, APIs, JSON/schema keys, data gates, and error codes remain unchanged.

## Update and remove

```sh
npx skills update dota2-match-coach --global --yes
npx skills remove dota2-match-coach --global
```

## Data gates

The runtime writes `dataQuality.gates`:

- `scoreboard` — basic match facts are available;
- `phase_aggregates` — observable stage metrics are available;
- `draft_ready` — five Radiant and five Dire heroes are known;
- `event_ready` — a usable event timeline is stored;
- `baseline_ready` — a peer sample of the same hero, position and bracket on the current patch is available;
- `current_patch` — the latest exact subpatch is verified.

A closed gate blocks the corresponding conclusion. For example, without `event_ready` the skill cannot invent the cause of a specific episode, and without `baseline_ready` it cannot label a metric good or bad for the relevant role/rank/patch.

## Validation

From the repository root:

```sh
node --test test/runtime/*.test.mjs
```

The offline suite contains 144 tests and needs no network access. Each wrapper runs only on its own platform: the POSIX script on macOS and Linux, and PowerShell on Windows. The test that does not apply to the current host is skipped, while both wrappers are also checked statically on every platform.

## Repository structure

```text
dota2-match-coach/          the installed skill bundle
  SKILL.md                 skill instructions
  agents/openai.yaml       OpenAI-compatible UI metadata
  references/              runtime, source policy, review template, decision stack
  scripts/                 runtime and platform wrappers
test/runtime/              offline node:test suite
docs/superpowers/          design spec and implementation plan
RESEARCH.md                source and design research
ROADMAP.md                 features the data gates anticipate but the runtime does not collect yet
```

Local `output/`, secrets, and process-specific `.superpowers/` artifacts are excluded from the repository.

## Source policy

OpenDota is the primary source for the match object and parse job. STRATZ adds position/lane/playback enrichment, while Valve verifies the exact current subpatch. Dota2ProTracker, the old Fandom wiki, and Valve `GetMatchDetails` are not runtime dependencies. See the full [source policy](dota2-match-coach/references/source-policy.md).

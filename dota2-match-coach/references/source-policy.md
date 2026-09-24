# Source and claim policy

## Scope and sources

The runtime supports only the current exact Dota 2 sub-patch. An older or unverified sub-patch is rejected before a success artifact is written; historical patches are permanently outside this skill's roadmap. Inspect source status before interpreting any artifact.

| Need | Evidence source | Limit |
|---|---|---|
| Match facts and parse state | OpenDota | a scoreboard is not replay-derived evidence |
| Team economy, objectives, wards, buybacks, skill build | OpenDota parsed match | logged values and events locate what happened, not why |
| Participants, lane, playback, peer baseline | STRATZ | token and each relevant capability are required |
| Exact current sub-patch | Valve timeline | unavailable verification is not a current-patch result |
| Mechanics | Valve datafeed for the current exact patch, collected by the runtime; Liquipedia only for an interaction the datafeed text leaves open | explains a recorded fact; does not create match evidence |
| Personal progress, when requested | runtime-validated normalized local artifacts supplied through `--history-dir` | require comparable player, hero, position, mode and current exact patch; descriptive change only |

Do not add Dota2ProTracker, a raw `.dem`, smoke or historical-patch analysis to the claim set. Personal comparison is permitted only through the validated local-history path above; arbitrary prior-match text, conversation memory or a profile snapshot is not a personal baseline.

## Facts, hypotheses and unknowns

- A **fact** is a value or event in the normalized artifact with its source and applicable timecode or interval.
- A **supported hypothesis** is labelled, tied to stated facts and given a confidence level. Plausibility does not turn it into a fact. A repeated death signature establishes a candidate pattern to inspect in this match; by itself it explains neither behaviour nor a death, entry/retreat choice, item timing, item effectiveness or an alternative outcome.
- `null`, an unknown entity name, a closed capability and an unavailable source remain unavailable. Never restate them as `false`, absence or a guessed name.
- If sources conflict, name the divergence and lower confidence; do not silently select a candidate. Preserve comparison scope: an interval aggregate is not a cumulative value at a match-time marker.

Never infer intent, vision, enemy cooldowns, mana, health, an ability's readiness or certain survival from a result. An item-use event proves only the recorded use, not an unrecorded target, direction, timing quality, effect or tactical correctness. A purchase proves a recorded purchase, not a correct build. A match-specific role task needs its supporting capability and sourced task facts. Mechanics knowledge can contextualize those facts but cannot supply missing match state.

## Match context

The parsed match records context around the player's own facts. Each section has its own status; an unavailable section is not an empty one.

- **Team economy** is the per-minute team difference from the selected side's perspective: earned gold (total gold earned, not net worth), XP, and net worth only when every participant recorded it. A leader change, extreme or largest swing is a measured change over its stated minutes. It can establish that the match situation changed and by how much; it does not establish why. Deaths, teamfights or objectives inside the same interval co-occur with the change; call one a cause only with further event evidence, and otherwise say that the cause is not recorded.
- **Objectives** are recorded building, Roshan, Aegis, Tormentor, first-blood and courier events with their time and side. The recorded killer is the credited last hit, which for a hero may come from its illusion or controlled unit, not everyone who contributed. The selected player's participation is supported only when they are the recorded killer or carrier; absence from the record is not absence from the objective. A deny is known only when the last hit's side is known.
- **Wards** are the selected player's recorded placements and the time each ward left the game, plus side totals when all five players' logs exist. A placement does not establish vision at a moment, what the ward revealed, whether it expired or was destroyed, or a named map location. A count is not a vision score or a quota.
- **Buybacks** are recorded buyback times; they do not establish that a buyback was necessary or effective.
- **Skill build** is the recorded upgrade order. The order is not the hero level of each upgrade, and a recorded choice does not establish that another choice was better.

## Current-patch mechanics

The artifact's mechanics are Valve datafeed values for the current exact patch: the selected hero's abilities, listed values and talents, the other heroes' abilities, the selected player's purchased items, and current sub-patch notes that touch them. Use them instead of memory to explain what a recorded ability, talent or item does, costs or requires.

- They never supply match state. A cooldown, mana cost or effect in the datafeed does not establish that an ability or item was ready, affordable, used well or effective at a moment of the match.
- A listed talent or value is the patch definition, not the player's choice; only the recorded skill build and purchases show what the player had.
- Patch notes describe what changed in the current sub-patch, not how the change affected this match.
- A description marked with an unknown value stays unknown; do not fill it from memory. When a needed mechanic is missing from the artifact, say so rather than relying on general knowledge.

## Language, names and ownership

Use the explicitly requested language; otherwise use the user's last substantive-message language. Localize review headings semantically. Preserve artifact spelling for hero, item, ability and source names. Coaching prose never exposes schema versions, capability or gate names, error-code names, internal IDs or field names. An unresolved name is a localized neutral equivalent of “unknown entity”, never an ID or a guessed name.

Use player-facing terms such as “показатель”, “отметка матча”, “среднее выборки”, “число матчей” and “основа ранговой выборки”, not schema keys. Fill any authoring placeholders with sourced values or omit the unsupported statement; never show placeholder delimiters or text.

Select by `accountId` when available. A hero-only selector must resolve one exact English hero and uses neutral third-person wording (“игрок на <Hero>”); it does not establish match ownership. Use second person only when the user explicitly says the match is theirs. If account and hero selectors conflict, stop with the runtime diagnostic.

## Comparisons and numbers

A ready peer comparison is a **mean** for the artifact's stated hero, position, rank cohort, selection method, patch weeks, player measure, match-time marker and match count. It is not a percentile, a personal comparison, a same-lane-matchup sample or automatically the player's rank. State the actual cohort and selection method, and name any mismatch with the player or match rank. Call it same-rank only when the stated cohort agrees with the player rank. Do not present a week-based patch approximation or current profile medal as a verified historical patch/rank measurement.

The baseline's `weeks` values are epoch-week indices (each represents 604800 seconds from the Unix epoch), not calendar week numbers or `YYYYWW` dates. Do not infer a calendar date from their digits or show these internal indices in coaching prose. Usually describe the selection as complete weeks inside the current patch. If dates matter to the user's question, calculate the UTC boundaries explicitly from the runtime definition before naming them.

A peer-comparison row's source labels the STRATZ reference, not every value in that row: the player's last hits, denies, XP, hero damage and net worth come from OpenDota time series; timed deaths come from STRATZ. Net worth is compared only through the replay's own per-minute net worth; the cumulative gold series is never a net worth measure. A copied comparison value and its original series are the same measurement, not independent corroboration. When scoreboard totals disagree with the same provider's timeline, describe an internal data mismatch rather than attributing the disagreement to different providers.

Distinguish these quantities:

| Quantity | Required support |
|---|---|
| Recorded fact or descriptive difference | the actual artifact values, matching definitions and time scope, with their provenance; expose conflicts and unavailable inputs |
| Numeric performance target or norm | a relevant ready peer row with matching player rank, hero/position and metric/time scope, neither fallback nor conflict; retain its sourced mean, minute, sample size, actual cohort and selection method |
| Organizational practice count | a clearly proposed workload such as episodes to inspect or games to record; no baseline is needed, and it makes no claim of a performance standard, statistical adequacy or proven training dose |

A sample mean is a reference, not a universal requirement or a guarantee of a better result. Do not invent target percentages, timings, quotas or improvements from it. A mismatched/fallback/conflicting comparison may be described with its limit when relevant but cannot become a same-rank norm or numeric performance target. Without a suitable comparison, use an observation or episode-review exercise. Recorded event counts remain reportable without a peer baseline.

Read the progress reference only for requested or explicitly enabled local-history comparison. Use its runtime-validated rows for the same account, hero, position, mode and current exact sub-patch. Missing comparability fields do not establish a match. Preserve the historical matches' provenance and any unavailable measures; never substitute zeros or mix definitions. A personal average is descriptive, not a peer norm. Between-match improvement or decline does not prove that an exercise, item choice or habit caused the change.

## Data limits

STRATZ without a token is an unavailable source, not a zero-data match: continue with permitted OpenDota facts and state the enrichment that is unavailable. Never ask for a token in chat or write it to an artifact. Raw API responses, headers and secrets never enter reports.

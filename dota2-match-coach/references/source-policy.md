# Source and claim policy

## Scope and sources

The runtime supports only the current exact Dota 2 sub-patch. An older or unverified sub-patch is rejected before a success artifact is written; historical patches are permanently outside this skill's roadmap. Inspect source status before interpreting any artifact.

| Need | Evidence source | Limit |
|---|---|---|
| Match facts and parse state | OpenDota | a scoreboard is not replay-derived evidence |
| Participants, lane, playback, peer baseline | STRATZ | token and each relevant capability are required |
| Exact current sub-patch | Valve timeline | unavailable verification is not a current-patch result |
| Mechanics | Liquipedia cross-checked with Valve | explains a fact; does not create match evidence |
| Personal progress, when requested | runtime-validated normalized local artifacts supplied through `--history-dir` | require comparable player, hero, position, mode and current exact patch; descriptive change only |

Do not add Dota2ProTracker, a raw `.dem`, wards, smoke, objectives or historical-patch analysis to the claim set. Personal comparison is permitted only through the validated local-history path above; arbitrary prior-match text, conversation memory or a profile snapshot is not a personal baseline.

## Facts, hypotheses and unknowns

- A **fact** is a value or event in the normalized artifact with its source and applicable timecode or interval.
- A **supported hypothesis** is labelled, tied to stated facts and given a confidence level. Plausibility does not turn it into a fact. A repeated death signature establishes a candidate pattern to inspect in this match; by itself it explains neither behaviour nor a death, entry/retreat choice, item timing, item effectiveness or an alternative outcome.
- `null`, an unknown entity name, a closed capability and an unavailable source remain unavailable. Never restate them as `false`, absence or a guessed name.
- If sources conflict, name the divergence and lower confidence; do not silently select a candidate. Preserve comparison scope: an interval aggregate is not a cumulative value at a match-time marker.

Never infer intent, vision, enemy cooldowns, mana, health, an ability's readiness or certain survival from a result. An item-use event proves only the recorded use, not an unrecorded target, direction, timing quality, effect or tactical correctness. A purchase proves a recorded purchase, not a correct build. A match-specific role task needs its supporting capability and sourced task facts. Mechanics knowledge can contextualize those facts but cannot supply missing match state.

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

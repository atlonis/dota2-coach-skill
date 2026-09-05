# Source and claim policy

## Scope and sources

The runtime supports only the current exact Dota 2 sub-patch. An older or unverified sub-patch is rejected before a success artifact is written; historical patches are permanently outside this skill’s roadmap. Read the runtime’s source statuses before interpreting any artifact.

| Need | Evidence source | Limit |
|---|---|---|
| Match facts and parse state | OpenDota | a scoreboard is not replay-derived evidence |
| Participants, lane, playback, peer baseline | STRATZ | token and each relevant capability are required |
| Exact current sub-patch | Valve timeline | unavailable verification is not a current-patch result |
| Mechanics | Liquipedia cross-checked with Valve | explains a fact; does not create match evidence |

Do not add Dota2ProTracker, a raw `.dem`, wards, smoke, objectives, personal baselines, or historical-patch analysis to the claim set.

## Facts, hypotheses, and unknowns

- A **fact** is a value or event present in the normalized artifact with its source and applicable timecode or interval.
- A **supported hypothesis** is always labelled, tied to stated facts, and given a confidence level. It never becomes a fact by being plausible. A repeated death signature alone is a candidate risk pattern to inspect, not an explanation of behaviour, an entry/retreat decision, item timing, item effectiveness, or a counterfactual outcome.
- `null`, an unknown entity name, a closed capability, and an unavailable source remain unavailable. Never restate them as `false`, absence, or a guessed hero/item/ability name.
- If sources conflict, name the divergence and lower confidence; do not silently select one candidate. If a comparison value’s scope differs (for example, phase aggregate versus cumulative value at a stated match-time marker), name the scope and do not substitute one for the other.

Never infer intent, vision, enemy cooldowns, mana, health, an ability’s readiness, or certain survival from a result. A successful item-use event proves only the use that was recorded, not its target, direction, timing quality, effectiveness, or tactical correctness. Do not prescribe a generic role task without a supporting capability and sourced task facts.

## Language and entity display

Use a language explicitly requested by the user; otherwise use their last substantive-message language. The Russian headings and closed forms are canonical Russian renderings; a response in another language uses faithful semantic localized equivalents in the same order and with the same constraints. Preserve the artifact spelling of hero, item, ability, and source names; do not translate those names. The player-facing coaching review must never expose a schema version, capability, gate, error-code name, internal ID, or internal field name. If an entity name is `null`, show a localized neutral equivalent of “unknown entity”; never expose its ID or guess a name from game knowledge.

In a player-facing comparison, use localized concepts such as “показатель”, “отметка матча”, “среднее выборки”, “число матчей”, and “основа ранговой выборки”, not source-field or schema-key labels. Tokens enclosed in `[` and `]` in authoring templates are placeholders: replace each with a localized player-facing label and actual sourced value; never render it literally. A Russian signature-only hypothesis keeps its exact canonical Russian form; another language may translate that meaning faithfully but must not add a clause or another hypothesis.

## Selector and address

Select by `accountId` when available. A hero-only selector must resolve one exact English hero and uses neutral third-person wording (“the player on <Hero>”); it does not establish match ownership. Use second person only when the user explicitly says the match is theirs. If account and hero selectors conflict, stop with the runtime diagnostic.

## Peer baseline

A ready comparison is a mean for the artifact’s stated hero, position, rank cohort, selection method, patch weeks, player measure, match-time marker, and count of matches. It is not a percentile, a personal comparison, a same-lane-matchup sample, or automatically the player’s own rank. State its actual rank cohort and selection method, and explicitly name any mismatch with the player or match rank. Call it same-rank only when the stated rank cohort agrees with the player rank. A numeric coaching target is valid only in the closed review-template ready-reference form, repeating the sourced player measure, match-time marker, and count of matches in localized player-facing language. Without such a row, use only the closed no-reference exercise form.

## Data limits

STRATZ without a token is an unavailable source, not a zero-data match: continue with the permitted OpenDota facts and state exactly what enrichment is unavailable. Never ask for a token in chat or write it to an artifact. Raw API responses, headers, and secrets never enter reports.

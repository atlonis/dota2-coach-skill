---
name: dota2-match-coach
description: Use when a user asks for a current-patch Dota 2 post-match review by match ID and identifies a player by account ID or hero, including draft, role, lane matchup, item build, stage efficiency, macro, or supported micro-mechanics.
---

# Dota 2 Match Coach

## Purpose

Give an evidence-backed coaching review of a match: first reconstruct what the hero was supposed to do in this specific draft, then judge the execution stage by stage. A win, the final scoreboard or a closed rating such as IMP does not replace the analysis — that is a working principle, not a sentence for the report.

## Scope of the first version

- Analyse only matches on the latest exact Dota 2 sub-patch.
- Use OpenDota and STRATZ for match data, Valve for the current rules and Liquipedia to explain mechanics.
- Work from parsed API data. Reconstructing a raw `.dem` and deep micro-mechanics diagnosis are out of scope for now.
- Do not use Dota2ProTracker as a source or as a runtime dependency.
- Unlock a conclusion only from fields actually collected into the artifact. A capability described in project documentation does not open a gate.

Read the [source policy](references/source-policy.md) before collecting data. Read the [review contract](references/review-template.md) before writing the answer.

To place a finding in a layer of mechanics and pick the horizon, the metric and the training format, use the [decision stack](references/decision-stack.md).

### Response language

- A language the user states explicitly overrides everything else. Otherwise answer a Russian request in Russian and an English request in English.
- If the current request is mixed or the language is ambiguous, use the language of the user's last substantive message. English hero, item, API and data field names do not switch the language by themselves.
- Localize the whole user-facing answer consistently: headings, the stage table, data limits, the STRATZ notice and the exercise. Do not mix Russian and English service phrases without need.
- Do not translate hero and item names, source names, numeric values or timecodes.
- Schema identifiers — field, key, gate and enum names and error codes — never reach the review in any language: they are internal names of the artifact. Write their meaning, and give provenance by naming the source ("according to STRATZ"). The substitution table and the only two exceptions live in the [review contract](references/review-template.md).
- Language adaptation applies to the coaching answer, not to the runtime contract: never change JSON or schema and never modify data collection for the sake of localization.

## Required process

1. For an ordinary `match_id` request, read the [runtime contract](references/runtime.md) as the first collection step and use `scripts/analyze-match.ps1` on Windows or `scripts/analyze-match.sh` on macOS and Linux. If an `account_id` is given, pass it to the wrapper. If a hero is named unambiguously instead, pass the hero name through `-Hero` on Windows or as the second positional argument on macOS and Linux. If neither selector is present, or the hero is ambiguous, ask for an `account_id`. After the run, check `sources` and `dataQuality.gates` of the produced artifact.
2. Establish the selected player, hero, position, lane, lane opponent, rank, game mode and exact sub-patch. When a hero and an `account_id` are both given, the runtime must confirm that they point at the same player.
3. Check the parse state. If replay-derived data is missing, request a parse through OpenDota and wait for the result; when the replay is unavailable, switch to degraded mode explicitly.
4. When the full draft and current mechanics are available, build the context before judging the player: the hero's duties, the expected matchup, both teams' strengths and weaknesses, the relevant power spikes. Otherwise mark those fields unavailable.
5. Compare execution first between the stages of the match itself, then against the peer baseline in `baseline.comparisons` once it is collected. A self-baseline of the same player, a sample of strong players and a game-mode filter are not collected by the runtime yet — never cite them as available.
6. Split the match into laning, transition, midgame and closing. Boundaries may move for real events of the match, but say that they moved.
7. Single out the turning episode or window, and a candidate or confirmed pattern, according to the available level of data.

### When STRATZ is not connected

If `sources.stratz.reason` is `missing_token`, say once at the start of the answer that STRATZ is not connected, list exactly which data is closed for this match, and offer to configure `STRATZ_API_KEY` through an environment variable or a secret manager. Never ask for the token in chat. Continue the available OpenDota review in degraded mode unless the user explicitly asks to stop for a fuller collection.

Without the token `baseline_ready` is closed too: the peer baseline comes from STRATZ. Even with the token it is not guaranteed — it needs a known position, a known rank (the player's own medal or the match average bracket) and at least one week lying entirely inside the current patch. Read the refusal reason from `baseline.reason` instead of guessing it.

### What the draft context stands on

Lane expectation (`lane_expectation`), draft fit (`team_fit`) and the statistical draft edge (`draft_prior`) rest on different foundations and do not replace one another. The names in brackets are internal — use the phrasings in the answer, not the names; the requirements for each are in the [source policy](references/source-policy.md). Hold three boundaries in the answer:

- `lane_expectation` without a sample of the same matchup, the exact patch, the positions and a close bracket equals `insufficient_data`. Current mechanics explain statistics but do not replace a sample.
- `team_fit` is a qualitative coaching judgement from the capability checklist of the full draft: name the facts, the gaps and the confidence, but never present it as a statistical probability.
- `draft_prior` without a documented model with a known output field and a relevant sample equals `insufficient_data`. Do not compute an edge percentage from an impression of ten heroes.

## Data sufficiency gates

Mark the available level first, then fill only the permitted fields:

| Available | Permitted conclusion |
|---|---|
| Scoreboard only | Facts of the result; no causes and no stage assessment |
| Phase aggregates | The strongest and weakest **observed stretch inside the match**; no cause |
| Peer baseline (hero + position + bracket + patch) | A normative stage verdict and a measurable performance target |
| Full draft and current mechanics | The exact hero task, `team_fit`, the item and skill build assessment |
| Event timeline | The cause of a specific episode, a macro alternative and the turning point |

Without the full draft, "the hero's task in this match" equals `insufficient_data`; general properties of the hero may only be raised as a hypothesis. Without a baseline, never call a stage strong or weak relative to the role — compare it only with the other stages of this match. With a baseline, compare only on the metrics and minutes that actually have a row in `baseline.comparisons`, and always name the sample size. It is a **mean**, not a percentile: say "above or below the mean by this ratio", never "you are in the bottom 30 per cent". The sample runs over four bracket buckets. The bucket is chosen by the player's own medal (`player.rank`), while `match.averageRank` is the match average bracket, which in a mixed lobby sits above or below the player. Read what the bucket stands on from `baseline.sameHeroPositionRankPatch.bracketSource`: with `match_average` the player's medal is unknown, and the stage verdict must carry that caveat. Mark a row with `crossSourceProxy: true` as a comparison across two different measurements and lower the confidence for it; no comparison sets that flag today, and the runtime collects no comparable per-minute net worth row at all. Without events, return a turning **window** rather than an invented point. One match yields a `pattern candidate`; it becomes recurring only after confirmation across several matches or several comparable episodes.

### Aggregate-only branch

When phase aggregates are available but the full draft, the role/rank/patch baseline and the event timeline are not, answer with the short form from the [review contract](references/review-template.md). This branch has no exact hero task, no item or skill build assessment, no normative words `good / bad / timely / late`, no causal story and no in-game recommendation such as rotating, smoking, pressuring, farming or taking an objective. Those slots appear only after the matching gate opens.

Metrics here may only be localized: `the 10-25 window is the priority for further work, because the combination of [metrics] changed inside it; this is localization, not a diagnosis`. The words `underplayed`, `lost tempo`, `failed to convert`, `impact`, `presence`, `pressure` and `combat efficiency` already assign game meaning to aggregates — they do not replace a diagnosis. State a positive finding the same way: `25-32 held the highest GPM, XPM and damage per minute among the phases`, not `the player restored their impact`.

Before the words `max`, `min`, `above` or `below`, write out the corresponding metric for all four phases and check the comparison. Never carry the rank of one metric over to the whole phase.

## Evidence contract

Every substantial conclusion contains:

- **Fact:** the source field, the value and the timecode or interval;
- **Expectation:** the relevant baseline or game task, with its source;
- **Interpretation:** what the difference may mean;
- **Confidence:** high, medium or low;
- **Alternative:** a concrete action, never presented as a guaranteed counterfactual.

Aggregates show **where** the observed numbers changed, but usually do not prove **why**, or whether the value was bad relative to the role. Lost runes, a wrong route, passivity, the player's intent, "farm instead of pressure" and the reason for a missed creep stay hypotheses until events and a baseline confirm them.

Never derive the method of entry into a fight from the position row yourself: a jump in coordinates looks the same for the player's own teleport, for stepping into an ally's warp and for being moved by someone else's ability. The runtime labels every jump with its cause — the player's own teleport item, stepping into an ally's warp, or cause not established. Rely on that label; without it, do not name the method of entry and do not judge the decision to enter.

## Output

Follow the full form of the [review contract](references/review-template.md), in this order: bottom line with the match line, the main finding, the pattern and the exercise, then the turning point, then one stage table, then draft and role, then data limits when any exist. The exercise appears once, at the top, and is not repeated at the end. Take a numeric in-game target from the baseline; without one, the exercise measures the process of observation or decision instead of an invented KDA, rotation or objective norm.

Expand a stage into a full row only when it earns attention: a deviation from the sample mean of at least 15 per cent on any compared metric at its checkpoint, or an event inside the stage, or a match extreme for a metric. Collapse the remaining stages into a single line with their numbers.

## Common mistakes

- Comparing a mid hero against that hero's support statistics.
- Calling an unknown model field such as IMP a draft edge percentage.
- Turning a correlation over a stretch into a story about runes, smokes or intentions.
- Declaring an item a mistake without the enemy line-up, the threats and the available alternatives.
- Reading a jump in the position row as a solo teleport when the player stepped into an ally's warp.
- Expanding all four stages when only one of them deviates or holds an event.

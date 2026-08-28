# Review contract

The template is adapted from the [Dota 2 Replay Review Template](https://bsjdota.com/blog/dota-2-replay-review-template/): match details, draft, laning, midgame, late game, key moments and an action plan. Role-aware baselines, explicit evidence and hybrid stage boundaries are added on top of it.

The order is inverted on purpose. The player gets the verdict, the decisive episode and the exercise first; the evidence that earns them comes after. A reader who stops after the first screen must already have something to act on.

## Response language

Keep the contract structure and localize every user-facing heading and explanation into the language selected by `SKILL.md`. Russian equivalents: `Bottom line` to «Итог», `Turning point` to «Переломный момент», `Stages` to «Стадии», `Draft and role` to «Пик и роль», `Data limits` to «Ограничения данных». Hero names, item names and source names are never translated. Schema identifiers never appear at all — see the next section.

## The review is read by a player, not a debugger

The review is text for a human. Field names, keys, gate names and enum values belong to the artifact and to the optional provenance block, not to the review. This changes how a finding is written, never what may be claimed: the gates still decide that.

| Never in the review | Write the meaning instead |
| --- | --- |
| `lane_expectation` | lane expectation / «ожидание по линии» |
| `team_fit` | how the hero fits the draft / «как герой ложится в состав» |
| `draft_prior` | statistical draft edge / «статистический перевес пика» |
| `insufficient_data` | insufficient data / «недостаточно данных» |
| `draft_ready`, `event_ready`, `baseline_ready` and other gates | obey them silently; when a gate is closed, name what is missing |
| `position_est`, `lane_role`, `rank_tier`, `seasonRank`, `gold_t` and any source field | "OpenDota estimates the position as 4", "the player's own medal", "the gold row" — the meaning, not the path |
| `POSITION_4`, `OFF_LANE`, `CRUSADER_ARCHON`, `player_medal` | "position 4", "offlane", "the Crusader-Archon bracket", "by the player's own medal" |
| `bracketSource`, `crossSourceProxy`, `matchCount`, `schemaVersion` | "what the bracket was chosen from", "a comparison across two different measurements", "sample size"; never show the schema version |
| `teleport_item`, `ally_warp`, `unattributed` | "teleported with a scroll or boots" / «телепорт свитком или ботинками», "stepped into an ally's warp, Underlord's Dark Rift" / «вошёл в перенос союзника», "how the player got there is not established" / «способ входа не установлен» |
| `mode: "full"`, `degraded` | "all data was collected" / "part of the data is unavailable, the report is incomplete" |

Provenance stays mandatory but human: "according to STRATZ", "OpenDota estimates the position as 4", "confirmed by Valve". Name exact fields and paths in only two cases: the user asks about the data or about debugging, or you put them into the final "Where the data comes from" block. That block is optional and always comes last.

Runtime failures are reported by meaning — "STRATZ did not answer", "the replay is not parsed yet" — not by code. Name the code only when the user is going to fix it themselves.

The report carries no status lines. Do not report that the data was collected, do not announce what the review will cover, do not retell your own method, and do not remind the reader that a win does not cancel analysis. Those are working principles, not text for the reader. Every sentence must carry a fact, a conclusion or an action.

## Aggregate-only branch

Use this short form when phase aggregates exist but the full draft, the role/rank/patch baseline or the event timeline do not. Do not try to fill the unavailable slots of the full form.

1. **Bottom line:** the available facts, the window that deserves further work, and a process exercise. No cause and no in-game recommendation.
2. **Context:** hero task, lane expectation, draft fit and build assessment are all insufficient data — one sentence, not a section.
3. **Stages:** one table, facts and each stage's rank per metric, without a normative verdict.
4. **Missing data:** the concrete event types a diagnosis would need.

In this branch there is no exact hero task, no item or skill build assessment, no normative words `good / bad / timely / late`, no causal story and no in-game recommendation such as rotating, smoking, pressuring, farming or taking an objective. Those slots open only when the matching gate opens.

Metrics here may only be localized: `the 10-25 window is the priority for further work, because the combination of [metrics] changed inside it; this is localization, not a diagnosis`. The words `underplayed`, `lost tempo`, `failed to convert`, `impact`, `presence`, `pressure` and `combat efficiency` already assign game meaning to aggregates and do not replace a diagnosis. State a positive finding the same way: `25-32 held the highest GPM, XPM and damage per minute among the phases`, not `the player restored their impact`.

Before writing `max`, `min`, `above` or `below`, write out the metric for all four phases and check the comparison. Never carry the rank of one metric over to the whole phase.

The table of this branch has exactly four fields besides the stage name — it has no `Task`, `Verdict` or `Alternative`:

| Stage | Facts | Rank among the phases | Unknown | Data needed |
|---|---|---|---|---|
| Laning 0-10 | | | | |

Build the comparison rows for every metric first, for example `XPM: 472 -> 269 -> 473 -> 801`, and only then attach the max and min labels. The rows need not be shown to the user, but the arithmetic check is mandatory.

An acceptable aggregate-only row:

| Stage | Facts | Rank among the phases | Unknown | Data needed |
|---|---|---|---|---|
| Midgame 15-25 | 7.4 LH/min; 348 hero damage/min; `0/3/4`, three deaths | LH/min is the highest of the four phases, hero damage/min the lowest | where the player was, which fights and objectives were available, why they died and whether that trade-off was right for this draft | position, rune, fight and death events, the full draft and an Earth Spirit position 2 baseline |

The verdict against the role is insufficient data for all four stages in this branch.

The full form below applies as the gates open.

## Full form

### 1. Bottom line

Four compact blocks, nothing else, before any table:

- **Match line:** match ID, result, duration, hero, position, lane, exact patch and bracket — one line, not a table.
- **Main finding:** the single most consequential thing the evidence supports, with its number and timecode.
- **Pattern:** one candidate or confirmed pattern. One match yields a pattern candidate; it becomes confirmed only after several matches or several comparable episodes.
- **Exercise:** the observed condition, the concrete action, the measurable criterion, and the moment of the short self-check after the game. A numeric in-game target requires a baseline and is taken from one specific comparison row, naming the metric, the minute and the sample size. Without a baseline the exercise measures the process of observation or decision instead of an invented KDA, rotation or objective norm.

The exercise lives here and is not repeated at the end of the review.

### 2. Turning point

With an event timeline, pick one episode with a timecode where the player's or the team's efficiency changed. Show the sequence `before -> action -> result -> available alternative`. Without an event timeline, name only the turning window between phases and the data needed to find the episode. Do not call an episode the cause of the whole match without a sufficient counterfactual.

If the episode contains a jump in the position row, take the method of entry from the cause recorded in the artifact, not from the jump itself. Stepping into an ally's warp is an entry together with the team and cannot be blamed as a solo initiative; when the cause is not established, do not name the method of entry at all, and assess what happened after the arrival instead.

### 3. Stages: one table

Mandatory stages: laning, transition, midgame, closing. Default boundaries are `0-10`, `10-15`, `15-25`, `25+`; move them for the end of the lane, a key item, the first big fight or an objective, and say that you moved them.

A stage is expanded into a full row only when it earns attention: any compared metric at its checkpoint deviates from the sample mean by at least 15 per cent, or the stage contains a death, a kill, an objective or a recorded reposition, or the stage holds the match extreme for a metric. Stages that meet none of these collapse into a single line under the table — "laning and transition stayed within the sample mean" — carrying their numbers and taking no row.

| Stage | Key facts | Against the sample | Verdict and confidence | Alternative |
|---|---|---|---|---|
| Midgame 15-25 | | | | |

- **Key facts:** the numbers of the stage plus the confirmed micro or macro behind them — ability, item, resource, movement, farm, fight or objective. Only what the events actually confirm.
- **Against the sample:** the ratio to the sample mean at this stage's checkpoint together with the sample size, for example `hero damage x0.55 (n=35101)`. This is a **mean**, never a percentile: write "below the sample mean by this ratio", never "you are in the bottom 30 per cent". Compare only on the metrics and minutes that actually have a comparison row. Values are cumulative, so the cell reads as the state at the checkpoint. Without a baseline the cell holds the stage's rank inside this match only.
- **Verdict and confidence:** `strong / mixed / weak / insufficient data`, followed by high, medium or low confidence.
- **Alternative:** one concrete, more reliable principle of action at the same level of detail as the evidence, never presented as a guaranteed counterfactual.

Keep cells short: a long evidence quote goes into a footnote line under the table, not inside a cell. Never fill a slot artificially — an unconfirmed micro or macro leaves insufficient data in the cell.

### 4. Draft and role

Compact prose, and only what the full draft supports.

- Both line-ups on one line each, then the lane matchup.
- **The hero's task in this draft:** three or four concrete duties derived from the picks. Without the full draft this is insufficient data.
- The three assessments in one line each, never in three paragraphs. Lane expectation needs a sample of the same matchup, patch, positions and a close bracket, and without it the honest answer is that there is nothing to say because no sample of this matchup exists. Draft fit is a qualitative coaching judgement from the capability checklist of the full draft — favourable, neutral or unfavourable, with facts and gaps, never a win probability. The statistical draft edge requires a documented model with a known output field and a relevant sample, and without one it is insufficient data.
- Show the actual lane outcome separately from the expectation.
- Power spikes and threats only when confirmed by the current patch.
- The situational fit of the item and skill build against this draft.

### 5. Data limits

Only when limits exist: a missing source, an unparsed replay, a closed gate, a thin sample, a bracket chosen from the match average rather than from the player's own medal. Complete data is not news — when everything was collected, this section does not exist.

## Correct boundary of a conclusion

Match `8963363814`, Earth Spirit position 2:

> **Fact:** the lane is recorded as a Radiant victory by STRATZ. At `10-15` the numbers fell to 338 GPM, 269 XPM and `1/2/0`; at `15-25` the player had 7.4 LH/min, 348 hero damage/min and `0/3/4`. Vessel appeared at 17:44.<br>
> **Interpretation:** `10-25` is the priority window for further work: it contains three deaths, the lowest hero damage per minute among the phases and the highest LH/min. This localizes a divergence between metrics; it is not a diagnosis of behaviour, and without a role, rank and patch baseline the stretch cannot be called objectively weak for an Earth Spirit mid.<br>
> **Not yet proven:** that the player chose farm over pressure, lost runes, stood passively in mid, let TA farm freely or should have smoked more often. Choosing between those causes needs routes, rune events, the specific deaths and both teams' states.<br>
> **Pattern candidate:** in one game the economic and the combat metrics diverged after the lane; one match is not enough to call it a recurring habit or to explain the player's actions.
> **Next analysis step:** work through the events around the deaths and compare them with the item timings, without judging the timings yet. Without the full draft, a baseline and events, the aggregate-only branch applies. The safe exercise is to record, after every death in `10-25`, the goal of the action, the visible information and the exit plan; assign a numeric target once a baseline exists.

## Common failures of form

- Opening with generic advice instead of the verdict and the exercise.
- Repeating the scoreboard without comparison and interpretation.
- Giving the same advice for all four stages.
- Listing ten mistakes instead of one pattern and one exercise.
- Expanding a stage that deviates from nothing and contains no event.
- Hiding a data limit at the end, after a confident unproven conclusion.
- Setting a numeric target for deaths, rotations or objectives without a baseline.

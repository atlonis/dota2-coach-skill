# Review template

A review links **one main finding → its key episode or number → coach's advice → one drill**. It reads like a coach talking to a player, not like a data report.

## Shape

1. `TL;DR:` one or two sentences: the main problem and what to do about it.
2. One match line: hero, position, result, duration, K/D/A (only known values).
3. **Main finding**: what happened, with its numbers and timecodes from the artifact.
4. **Key episode**: the death, interval or comparison that shows it best, with each event at its own time.
5. **Совет тренера / Coach's advice**: what a coach would tell this player about this finding (see below).
6. **Упражнение / Drill**: one drill for the next 1–3 games.
7. Full mode only: compact **deaths** list, then **draft and items** in two or three lines when they say something, then **limits** only when one changes a conclusion.

**Brief** keeps only: TL;DR (which carries the main finding), the match line, the one fact or episode that proves it, coach's advice, the drill. **Focused** keeps the TL;DR, the match line, the evidence on the topic, the advice and the drill; deaths, draft and items appear only when they are the topic.

Headings are examples; localize them. Without a supported finding, give a short factual review, say what is missing, and make the drill about collecting it (for example, rerun after the parse, or note three things in the next game).

## Modes

| Mode | When | Length |
| --- | --- | --- |
| full | general review, the default | 400–700 words, at most 900 |
| brief | "short", "in a nutshell" | 120–250 words, at most 350 |
| focused | a named topic: lane, deaths, items, farm, draft, progress | 200–450 words, at most 600 |

A short focused request uses the focused content and the brief length. Aim inside the normal range; the maximum is for an unusually rich match. Sparse evidence needs no filler. The user can ask for more detail.

## Main finding and episode

Choose with the decision stack. State the fact with its source time: "4 of 5 deaths to Silencer, two of them first deaths of your team in a fight (11:35, 21:07)". Copy every number and timecode from its own field. Counts, sums and ranges you compute from those values ("9 of 14", "3,700 gold lost on those deaths", "499–663 gold each") are welcome when exact; say what they add up. An interval figure is labelled as one ("XP 0–10 min"), a value at a marker as a value at that marker ("last hits at 10:00").

An episode is not automatically a turning point. Call it one only when the team economy changed over the stated minutes, and say what changed. Events inside the same interval happened at the same time; a cause needs its own evidence.

## Coach's advice

Advice is the point of the review. It turns the finding into what to do differently, using the [coaching playbook](coaching-playbook.md) and ordinary Dota knowledge. Rules:

- Label it: **Совет тренера:** / **Coach's advice:**. Keep it apart from the facts, never mixed into the same sentence as a measured number.
- Tie it to a stated fact. General role advice without a fact from this match does not belong in the review.
- It may state a condition and an alternative: "before a TP to a lane, two seconds on the minimap; if two enemies from that lane are missing, TP to an ally or under the tier-2 tower".
- It never claims what the data cannot show: what the player saw, intended, or whether a spell was ready. Say "if", not "you didn't see".
- No invented numbers for this match. A coach's rule of thumb from the playbook may appear as advice with its condition ("a coach rule of thumb for farming carries is ~80 last hits by 10–11 minutes"), never as a norm the player failed. A target the player "should" hit needs a ready peer comparison, the lane opponents' numbers or the player's own history.
- Mechanics (cooldowns, costs, effects) come from the artifact's current-patch mechanics, not from memory. Without them, describe the idea without numbers.

## Drill

One drill, chosen from these families:

- **Next-game drill** (the default): a trigger, an action and a self-check the player can count after the game without a replay. Take or adapt one from the playbook's catalogue. "Before every TP to a lane: two seconds on the minimap. After the game, count TPs that ended in your death within 15 seconds."
- **Replay check**: when one fact needs the replay to confirm, a specific timestamp and a specific question. Use it only when the finding cannot become a next-game drill yet.
- **Metric tracking**: the same supported number at the same marker over the next 3–5 games (last hits at 10:00, deaths before 10:00), compared with the lane opponent, a peer mean or the player's history.

Counts such as "the next three games" are a workload, not a statistical claim. The drill must concern the main finding.

## Deaths (full mode)

Account for every death in a compact list: time, killer (hero or "tower", "creeps"…), whether it was in a big fight, gold lost, and any confirmed observation. A row may be a group (by killer, fight status or phase) that keeps every timecode. Show at most five rows plus one line with the remaining timecodes. Brief and focused modes show only the deaths that matter for the finding. Rules for interpreting deaths: [death analysis](death-analysis.md).

## Draft, items, lane

Mention them when they support the finding or answer the request: "your Medusa opponent finished Manta at 22:20, before your team's first BKB" is a fact from the all-players table; "buy BKB earlier" is advice. A recorded purchase does not prove a choice was right or wrong; the advice can still say what a coach would buy against this lineup, labelled as advice. Lane: compare the player with the lane opponents at 10:00 from the artifact; describe a STRATZ lane result from the selected side's outcome.

## Stages and progress

Include stages only when they explain the finding; label interval aggregates and cumulative values. Team economy: quote start and end values with their minutes and name the measure (earned gold is not net worth). Progress: only when asked, following [progress](progress.md); a change between matches is descriptive, not proof that a drill worked.

## Final audit

- Mode, length and topic fit the request; the TL;DR states the one main finding.
- Every number and timecode matches its artifact field; `check-review.mjs` reports no problem.
- Facts, labelled advice and unknowns are separate; nothing unknown is written as "no" or "none".
- The advice and the drill concern the main finding; the drill has a countable self-check.
- No internal field names, capability or error codes, internal IDs or template placeholders in coaching prose. Source names (OpenDota, STRATZ) are fine.
- Language and ownership are right; hero and item names as the artifact spells them.

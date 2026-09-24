# Coaching evaluation — 2026-09-24

Evaluated `claude/lucid-faraday-tn19tw` with a working tree equal to `3b5a556`: minute-keyed series, team economy, objectives, wards, buybacks, skill build and current-patch Valve datafeed mechanics. Independent consuming agents received only the skill bundle, one case's request and its generated evidence, without this rubric, intended answers or implementation history. Answers were assessed against the generated evidence using the [rubric](README.md).

| Case | Final assessment | Observed behavior |
| --- | --- | --- |
| full-review | Pass | Accounted for 10:00, 15:00 and 20:00; kept the repeated teleport sequence as an observation; linked the 14:48–15:00 episode to a teleport-log exercise; left the draft unassessed because mechanics were not collected. |
| focused-items | Pass | Stayed on items; kept every timecode from 9:48 to 10:00 and 14:48 to 15:00; made no early, late or effect claim; did not describe Force Staff from memory while mechanics were unavailable. |
| zero-deaths | Pass | Reported zero deaths; chose hero damage against the sample mean and attributed its 6000 versus 12500 disagreement to OpenDota alone. |
| rank-mismatch | Pass | Named Divine–Immortal selected by the match average against the Legend 2 medal; kept the mean as a reference; noted that net worth could not be compared because neither side recorded it. |
| missing-playback | Pass | Preserved three scoreboard deaths without times; stated that causes and repetition cannot be established; named the unavailable sections as unavailable. |
| unknown-item | Pass | Left the item unnamed and its ID hidden; used third person; made no mechanics claim. |
| lane-focus-with-deaths | Pass | Answered 20 versus 45 last hits at 10:00 over 500 matches; deferred the deaths; tracked the same metric without a target. |
| personal-progress | Pass | Reported 50 against a personal mean of 35 over two prior matches; rejected a training effect. |
| turning-point | Pass | Located the change at 14:00 +3500 to 19:00 −2600 in earned gold, opponent ahead from 17:00, and called it earned gold, not net worth; listed the towers, Roshan, Aegis and the 15:00 death as co-occurring with the cause unrecorded. |
| item-mechanics | Pass | Quoted the synthetic datafeed values (push 575, cooldown 21, mana 95, cost 2150) and the 600 to 575 change, which differ from the live game, so the answer used the artifact rather than memory; judged no use. |
| support-wards | Pass | Reported four observers and one sentry with placement and exit times, including −0:30; derived the gap from 15:00 to 22:30 from those times; made no vision, location, dewarding or quota claim. |

The turning-point exercise tracks every teleport in the next game against the 10:00 and 15:00 sequence instead of reviewing the whole swing window. The request asked for a next-game task and the exercise follows the window's key episode, so the case passes; its rubric row now names the key episode explicitly. No skill correction was needed in this run.

Generating the cases exposed an inventory defect: a pre-horn ward rendered as `-1:-30`. Pre-horn times now render as `-0:30`, and the cases were regenerated before the agents ran.

Runtime validation: **305 passed, 0 failed, 4 skipped** across 309 Node tests. The skips were the three Windows-specific tests and the opt-in live smoke. The session's network policy blocked OpenDota, STRATZ and dota2.com, so no live source was called. The new parsers were checked instead against OpenDota's published parsed-match test data and a public dump of the Valve datafeed covering 127 heroes, 589 items and the 7.41 patch notes; a live current-subpatch smoke remains the release gate.

## Earlier run — 2026-09-07

Evaluated the working-tree implementation on `feat/coach-progress-and-reviews`, based on `c64fbf3`. Independent consuming agents received the skill, synthetic evidence and user requests, without the grading rubric, intended answers or implementation history. Answers were assessed against the generated evidence using the [rubric](README.md).

| Case | Final assessment | Observed behavior |
| --- | --- | --- |
| full-review | Pass | Accounted for 10:00, 15:00 and 20:00; separated recorded circumstances from causes; selected one related episode-review exercise. |
| focused-items | Pass | Stayed on Force Staff, retained use timecodes, and did not judge its target, timing or effect from death alone. |
| zero-deaths | Pass after recheck | Reported zero deaths; identified conflicting damage measurements without inventing a death or a tactical error; tied the exercise to checking that measurement. |
| rank-mismatch | Pass after recheck | Identified Legend versus Divine–Immortal and the inconsistent selection basis; did not turn the stronger cohort into a target. |
| missing-playback | Pass | Preserved three scoreboard deaths and unknown event times/causes; proposed a focused replay observation. |
| unknown-item | Pass | Retained third-person ownership, left the item unnamed and hid its internal ID; made no mechanics claim. |
| lane-focus-with-deaths | Pass after recheck | Addressed 20 versus 45 last hits at 10:00 over 500 matches, instead of switching to repeated deaths; did not call the difference missed opportunities. |
| personal-progress | Pass | Reported 50 versus a personal mean of 35 over two prior matches at 10:00; explicitly declined to attribute the increase to training. |

The first pass exposed an unsupported calendar-week interpretation in three answers. The evaluation fixture now uses real epoch-week indices generated by `fullWeeksWithin()`, and the source policy explains their definition and recommends ordinary selection wording rather than internal numbers. The three affected cases were rerun.

The zero-deaths recheck also exposed ambiguous attribution of the player's copied damage measurement to the peer-reference provider. The source policy now distinguishes player-series provenance from the reference's provider and distinguishes an internal scoreboard/timeline mismatch from a disagreement between providers. The affected case was rerun again and correctly attributed both player values to OpenDota.

Runtime validation: **266 passed, 0 failed, 4 skipped** across 270 Node tests. The skips were the three Windows-specific tests and opt-in live smoke. Skill frontmatter/link validation and `git diff --check` passed. No live match APIs were called; these results do not validate current external-service availability or Windows execution.

The scenarios are reproducible using `generate-cases.mjs`; generated evidence and consuming-agent answers were kept outside the repository. These are semantic behavior checks, not exact-text golden files or a statistical estimate of model reliability.

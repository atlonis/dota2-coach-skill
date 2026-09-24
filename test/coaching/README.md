# Behavioral review evaluations

Runtime tests validate evidence. These cases evaluate the consuming agent's coaching answer, including whether it respects a narrow request and connects its exercise to the main finding.

Generate synthetic cases outside the repository:

```sh
node test/coaching/generate-cases.mjs /tmp/dota-coach-evals
```

For each case, give an independent agent the current `dota2-match-coach/SKILL.md`, that case's `request.md`, and its evidence files. Do not give it this rubric or an intended answer. Save the answer outside the working tree. No live APIs, tokens, or actual match IDs are needed. Do not replace the consuming-agent evaluation with regex assertions on skill text.

Assess each answer against its evidence:

| Case | Required behavior |
| --- | --- |
| full-review | Accounts for all three death timecodes, distinguishes observation from cause, and connects one selected finding to its exercise. |
| focused-items | Answers the item question directly; does not claim a recorded use was early, late, effective, or wrongly targeted; exercise concerns the item episode. |
| zero-deaths | Reports zero rather than inventing a death episode or problem; chooses another supported focus and related exercise. |
| rank-mismatch | Identifies the actual stronger cohort and fallback selection; does not present its mean as the player's same-rank norm or a required target. |
| missing-playback | Preserves scoreboard deaths; explains that causes and repetition cannot be established; proposes observation rather than a fabricated tactical correction. |
| unknown-item | Keeps the unresolved entity unnamed, omits its internal ID, uses third person, and does not infer mechanics. |
| lane-focus-with-deaths | Answers the 10-minute last-hit question even though repeated death signatures exist; the exercise concerns that metric. |
| personal-progress | Reports 50 current last hits against a mean of 35 over two prior matches at 10:00; does not infer that training caused the increase or turn it into a normative target. |
| turning-point | Locates the change from team economy with its minutes and values (largest adverse earned-gold swing 14:00 +3500 → 19:00 −2600, opponent ahead from 17:00) and calls it earned gold, not net worth; treats the lost bottom towers, the enemy Roshan and Aegis and the 15:00 death as recorded events in that window, not proven causes; the exercise concerns that window or its key episode. |
| item-mechanics | Explains Force Staff from the artifact's mechanics (push 575, cooldown 21, cost 2150, the sub-patch change from 600 to 575), not from live-game memory; reports the purchase at 5:00 and uses at 9:58 and 14:58 without judging readiness, target, direction or effect. |
| support-wards | Reports four observers and one sentry with their placement times, including the pre-horn observer at −0:30, and when each ward left the game; claims no vision, location, dewarding or expiry, and no ward quota; side totals stay recorded counts. |

Across cases, verify: numbers and timecodes match evidence; unknowns are not absence; hypotheses add no unrecorded facts; response language and ownership are correct; any exercise is linked to the selected finding. Organizational practice counts may be proposed, but are not empirical game targets. Fail a case for a material unsupported claim, incorrect quantity, wrong scope, or unrelated exercise; allow different useful phrasing.

The personal-progress case uses real `buildProgress()` output from synthetic prior matches. Automated filtering and arithmetic regressions live in `scripts/test/progress.test.mjs`.

Record the skill revision, scenarios, pass/fail observations, and any correction made. Re-run affected cases after a semantic correction. These evaluations complement the offline Node suite; they are not executed by `node --test` and are not a live-source release check.

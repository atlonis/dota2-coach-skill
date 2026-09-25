# Benchmark on real matches

The [synthetic evaluation](../coaching/README.md) checks that a review stays within its evidence. This benchmark checks whether a review is useful: whether it finds the problem that mattered in a real match, and whether its exercise is one the player would do. It is the source of new [roadmap](../../ROADMAP.md) items.

The criterion, from [RESEARCH](../../RESEARCH.md#how-to-test-the-quality-of-the-future-skill): not matching wording, but finding a real, proven and fixable problem.

## Privacy

Everything tied to a player stays local, under `dota2-match-coach/output/benchmark/`, which git ignores. That covers account and match IDs, artifacts, self-assessments and reviews. Only the protocol and the anonymised results, by case number, hero, position and outcome, are committed. Raw responses and tokens are never written anywhere.

## 1. Select the matches

- 10–15 of one player's own matches on the current exact sub-patch, the only patch the runtime accepts.
- Exclude games that ended early by abandonment, and matches the runtime refuses.
- Keep wins and losses; the set should include a bad match whose mistake the player already knows, a good match, and an ambiguous one.
- Where possible, add two or three matches of a strong player on the same role. In a well-played game the skill must not invent a problem.

## 2. The player's blind assessment

Before any review of the round exists or is read, the player writes one line per match:

```text
<case> | <position played> | what went wrong, in one line (or "nothing major")
```

Optional: the one thing he would work on after this game. The assessment is written from memory, without opening the replay.

## 3. The review

For each match, an independent agent receives only:
- the current skill bundle: `dota2-match-coach/SKILL.md` and its references;
- the match's normalized JSON and evidence Markdown;
- the request: a full review, in the player's language.

It does not see the player's assessment, this protocol or other cases. Reviews are saved locally next to the artifacts. The reviewer records the skill revision.

## 4. Scoring

The player scores each review after reading it, with the assessment line next to it.

| Criterion | Values |
| --- | --- |
| Main finding against the player's line | same problem · related · different · the review found no problem |
| If different: is the review's finding real? | yes, it happened and mattered · it happened, but didn't matter · wrong · can't tell |
| Exercise | would do it in the next games · would not · unclear what to do |
| Factual errors | count, each with the claim and the correct value |
| Caveats | fine · distracting · they bury the finding |

A review **passes** when its main finding is the same, related, or different but real and mattering; its exercise is one the player would do; it has no factual error; and its caveats don't bury the finding.

## 5. Classify every failure

Each failed criterion gets one cause:

- **missing data**: the problem was real, but the artifact lacks what would show it. Name the data, such as positions between deaths or the lane and neutral split of last hits. The [coaching video synthesis](../../research/coaching-videos/SYNTHESIS.md#data-the-artifact-would-need) lists the likely candidates.
- **priority**: the evidence was in the artifact, but the decision stack chose another finding.
- **template**: the finding was right, but the exercise, the length or the caveats failed it.
- **fact**: a number, time or name was wrong.
- **player disagrees, evidence unclear**: kept as an open question, not a failure of the skill.

A cause that repeats across cases becomes a roadmap candidate, with the cases that support it.

## 6. The coaching loop

After scoring, pick one review whose exercise the player accepts. Over the next three to five games on the same role, the player does the exercise. Then rerun the runtime on those games with `--history-dir` pointing at the saved artifacts, and record:
- whether the exercise was done;
- how the metric it concerns moved.

The movement is descriptive, not proof that the exercise caused it.

## Results

Record each round in `RESULTS.md` in this folder:
- the date and the skill revision;
- per case: number, hero, position, outcome, the scores and the failure causes;
- the causes that repeat, and the roadmap candidates they support.

No IDs.

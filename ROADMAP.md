# Roadmap: Dota 2 Match Coach

A document for developing the repository, not a part of the installed skill: the agent does not read it while writing a review. What is implemented today is described in [SKILL.md](dota2-match-coach/SKILL.md) and the [source policy](dota2-match-coach/references/source-policy.md); a stage described below is not a claim of capability.

## How work is prioritised

The skill is developed from the quality of its reviews on real matches, not from the number of data sources it reads. The synthetic [coaching evaluation](test/coaching/README.md) checks caution: it can fail a review for an unsupported claim, but not for a vague or impractical one. It has never been compared with the player's own view of a match or with a strong player's review, which [RESEARCH](RESEARCH.md#how-to-test-the-quality-of-the-future-skill) calls mandatory.

So the order is:

1. Run the [benchmark on real matches](test/benchmark/README.md).
2. Record each failure: a missed main problem, an impractical exercise, a factual error, or caveats that bury the finding.
3. Take the next item from those failures. Each item below names the kind of failure it would close; an item without a failure to close waits.

Every stage must preserve provenance, the current-exact-patch rule for mechanics, and the ban on conclusions while a gate is closed.

## 1. Benchmark on real matches

The protocol is in [test/benchmark](test/benchmark/README.md). In short:

- 10–15 of one player's own matches on the current sub-patch, and where possible two or three matches of a strong player on the same role, where the skill must not invent a problem;
- before seeing any review, the player writes one line per match: what went wrong;
- an independent agent writes each review from the skill and the artifacts only;
- each review is scored on its main finding, the practicality of its exercise, factual errors and caveat overload.

Definition of done: a first round is scored, and every failure is classified with the data or rule that would have prevented it.

## 2. The coaching loop

A review ends with one exercise. The loop checks what happens next:

- review, exercise, then the player's next three to five games on the same role;
- rerun the runtime on those games with the saved history, and check whether the exercise was done and whether the metric it concerns moved.

A movement is descriptive: it does not prove that the exercise caused it. Definition of done: one full loop recorded for at least one exercise.

## 3. Candidates to confirm on the benchmark

Raised in priority by the review of this roadmap on 2026-09-25. Each still needs a benchmark failure before work starts.

- **Death context per death.** The `deathContext` capability opens only when every death has a complete context, so one participant position older than three seconds closes it for the whole match. In the last live run 1 of 11 deaths was incomplete, and ten complete contexts stayed behind the closed capability. Closes: a review that cannot use known death circumstances.
- **Personal history, collected automatically and across sub-patches.** Today history is a directory of saved artifacts, filtered to the same exact patch, so it resets every one or two months. Collect the player's recent matches automatically and mark each with its patch. Earlier sub-patches would serve only as marked personal history: a match on an old patch is still never reviewed, and mechanics stay strictly current-patch. Closes: a progress or loop check with too few comparable matches.
- **A turning window.** The death analysis already accepts a window around the largest team-economy swing; the runtime does not yet compute it. Closes: a review that misses where the game turned.
- **Item-timing norms**, if STRATZ purchase statistics give a sample size for the same hero, position and bracket. Closes: a review that cannot tell whether a key item was late.
- **Data the runtime collects but does not publish.** The [coaching video synthesis](research/coaching-videos/SYNTHESIS.md#data-the-artifact-would-need) ranks it by how many coach claims need it. All ten players' positions over time come first. They are followed by teleports, the split of last hits between lanes and neutrals, and teamfight intervals. Closes: a review that misses a problem such as walking away from waves or farming the wrong area.
- **Ward coverage at a death.** Ward coordinates stay out of the artifact until OpenDota's ward grid is verified against the STRATZ position grid used by death contexts.
- **Objective participation** beyond the credited last hit, from positions near the building or pit at the event time.

Engineering work that no review failure depends on, such as a per-patch cache of datafeed records, can be done when it is cheap.

## Frozen

Kept for reference; no work until a benchmark failure shows the need.

- **Statistical draft model.** A verifiable `draft_prior` needs matchup and synergy samples by position, bracket and mode, a calibrated model and a documented version. None of the coaches in the video set picked the draft as the player's main problem except one pick-order session, so the cost is not justified yet.
- **Raw `.dem` parsing.** Orders, cooldowns, mana and health windows, vision and creep aggro would open what match APIs cannot show. It needs safe replay retrieval, a parser compatible with each patch, and separate confidence rules for broken replays.

## Removed

- **A percentile and a confidence for every comparison.** STRATZ gives only means per bucket, so the goal needs a different collection. The peer comparison stays a ratio to the mean with its sample size.
- **A strong-player baseline.** Recent leaderboard matches on the same hero and position would give a reference for what good looks like, not a norm for the player's rank. The benchmark uses a few strong-player matches as a control instead.

## Implemented and kept

- A peer baseline from STRATZ `heroStats.stats` for the same hero, position, rank bucket and patch, opened per metric only above its observed sample threshold.
- A descriptive self-reference through `--history-dir`.
- Team economy, objectives, wards, buybacks, the skill build, the lane outcome and current-patch Valve datafeed mechanics, confirmed against live responses on the current sub-patch.

Known limits of the baseline: the medal is the account's current one, not the one at match time. The patch is approximated by complete weeks. Net worth per minute exists only for parses since August 2026.

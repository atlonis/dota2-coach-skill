# Roadmap: Dota 2 Match Coach

A document for developing the repository, not a part of the installed skill: the agent does not read it while writing a review. The roadmap lists capabilities already anticipated by the data gates but not yet automated in the runtime. Every stage must preserve provenance, exact-patch filtering and the ban on conclusions while a gate is closed.

What is implemented today is described in [SKILL.md](dota2-match-coach/SKILL.md) and the [source policy](dota2-match-coach/references/source-policy.md); a stage described below is not a claim of capability.

## 1. Statistical draft model

The goal is to give a verifiable `draft_prior` rather than a subjective edge percentage.

- collect matchup and synergy samples for the current exact patch, filtered by position, bracket and mode;
- separate `lane_expectation` from the overall advantage of the ten heroes;
- formalize the `team_fit` capability vector: initiation, control, save, frontline, damage profile, tower and objective pressure, wave clear, scaling and fight continuation;
- pick a documented draft-advantage model and store the model version, the sample size and the calibration metadata;
- output a probability only with a sufficient sample and measured calibration; otherwise `insufficient_data`;
- test the symmetry of the sides, unknown heroes, small samples and a change of the exact sub-patch.

Definition of done: `draft_prior` carries provenance, model version, sample size and confidence or calibration, and does not open from the single fact of a complete draft.

## 2. Role, rank and patch baseline, and strong players

The goal is to open `baseline_ready` and replace within-match extrema with a relevant normative comparison.

The peer baseline is implemented: the runtime writes `model.baseline.sameHeroPositionRankPatch` from STRATZ `heroStats.stats`, picks the bucket by the player's own medal, and opens `baseline_ready` only for a sample that passed the size threshold. What remains:

- a self-baseline: the same player, hero, position, patch and mode;
- a strong-player baseline: recent STRATZ leaderboard matches on the same hero and position on the exact patch;
- the rank at the time of the match instead of a profile snapshot: neither OpenDota nor STRATZ gives it, so the player's medal is taken from the current state of the account;
- separate distributions by lane matchup, item components and power-spike timing;
- a percentile instead of a ratio to the mean: the current source gives only means, so a different collection is needed;
- the exact patch instead of an approximation by weeks, and a mode filter;
- a per-minute net worth comparison: the OpenDota `gold_t` proxy was removed as inflating, and neither OpenDota nor STRATZ `playbackData` gives a comparable per-minute net worth row;
- an automatic fallback to a wider sample only when marked as a weak reference.

Definition of done for the remainder: every comparison carries a percentile and a confidence, not only a ratio to the mean and a sample size.

## 3. Raw `.dem` and deep micro-mechanics

The goal is to analyse not only the successful events of the API, but also the opportunities available to the player and the sequence of inputs.

- safe replay retrieval and a patch and parser compatibility check;
- a parser for orders, cast attempts, cooldowns, mana and health windows, vision, creep aggro and unit state;
- reconstruction of a specific wave: creep health, attack projectiles, the deny and last-hit window and the available abilities;
- detecting full mana during an available useful spell window without automatically declaring a mistake;
- missed-opportunity analysis through the state of the world rather than through the absence of a success event;
- episode evidence with a timecode, the state before the input, the action, the result and an alternative;
- separate confidence rules for incomplete or corrupted replays.

Definition of done: the skill can explain a specific lane micro-mechanic from a `.dem`, reproduce the evidence and tell a confirmed mistake from a hypothesis.

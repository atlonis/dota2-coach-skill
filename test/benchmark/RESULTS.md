# Benchmark results

## Round 1 — 2026-09-25, in progress

Skill revision: `5e1678d`. Scores are pending: the player's blind assessment comes first, then the reviews.

### Cases

Every match of one player on 7.41f up to the round, except one that ended at 8 minutes. That gives nine cases, fewer than the 10–15 the protocol asks for; the round continues with new matches. No strong-player control yet.

| Case | Hero | Position | Result | Duration |
| --- | --- | --- | --- | --- |
| 1 | Nyx Assassin | 5 | loss | 56 min |
| 2 | Nyx Assassin | 5 | loss | 45 min |
| 3 | Tidehunter | 3 | win | 48 min |
| 4 | Night Stalker | 3 | win | 50 min |
| 5 | Doom | 3 | win | 32 min |
| 6 | Chaos Knight | 3 | win | 33 min |
| 7 | Slardar | 3 | loss | 32 min |
| 8 | Drow Ranger | 1 | loss | 40 min |
| 9 | Spirit Breaker | 4 | win | 24 min |

### Data readiness, before any review

- **OpenDota rate limit (fixed).** The first batch lost OpenDota data in eight of nine cases. Polling a parse job every second used up the free limit of 60 requests a minute, and the following runs were refused. Fixed in `c0419ac`: the poll interval is now five seconds. The rerun, a minute apart, left seven cases waiting for OpenDota's parse beyond the 240-second timeout; a third run once the parses finished gave complete artifacts for all nine.
- **Death context closed in eight of nine cases.** Of 78 deaths with a context, 32 are incomplete: another participant's position is missing, or the death's own position is. Because one incomplete death closes the `deathContext` capability for the whole match, the other 46 complete contexts cannot be used either. Case 6, with one death, is the only case with the capability open. This is the first benchmark evidence for the roadmap candidate "death context per death"; whether it changes a review's main finding is checked when the reviews are scored.
- **No STRATZ playback in case 1.** STRATZ returned the match without playback, so the timeline, positions and every death context are unavailable, and 12 scoreboard deaths stay unresolved. The review must say what it cannot know.
- **Mechanics partial** in five cases: four from the 30-item limit, one from a datafeed request that timed out.

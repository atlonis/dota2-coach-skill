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

- **OpenDota rate limit (fixed).** The first batch lost OpenDota data in eight of nine cases. Polling a parse job every second used up the free limit of 60 requests a minute, and the following runs were refused. Fixed in `c0419ac`: the poll interval is now five seconds. The rerun, a minute apart, left seven cases waiting for OpenDota's parse beyond the 240-second timeout; a third run once the parses finished gave complete artifacts for all nine. *Root cause found on 2026-10-19 by an independent audit:* the client waited for a `state` field that OpenDota's job endpoint never returns, so it could not see a finished parse and always ran to the timeout. Fixed; a live unparsed match now completes in about 15 seconds.
- **Death context closed in eight of nine cases.** Of 78 deaths with a context, 32 are incomplete: another participant's position is missing, or the death's own position is. Because one incomplete death closes the `deathContext` capability for the whole match, the other 46 complete contexts cannot be used either. Case 6, with one death, is the only case with the capability open. This is the first benchmark evidence for the roadmap candidate "death context per death"; whether it changes a review's main finding is checked when the reviews are scored.
- **No STRATZ playback in case 1.** STRATZ returned the match without playback, so the timeline, positions and every death context are unavailable, and 12 scoreboard deaths stay unresolved. The review must say what it cannot know.
- **Mechanics partial** in five cases: four from the 30-item limit, one from a datafeed request that timed out.

## Agent check after the audit fixes, 2026-10-19

Not a scored benchmark round: there is no blind player assessment. Two fresh agents received only the skill bundle, the runtime's artifact and the user's message; neither had a STRATZ token.

| Case | Request | Result |
| --- | --- | --- |
| 9040490705, Brewmaster pos 3, win 80:56, 6/20/20 | full review | Main finding: 7 deaths after 50:00 outside big fights, 499–663 gold each, chosen over the runtime's "first death in fights" pattern by recorded cost; the 50–55 minute team-economy reversal as the episode, with the deaths described as co-occurring, not causing it; Mirana's arrow range taken from the artifact's mechanics; a labelled low-confidence hypothesis on two facts; a next-game drill. 693 words. Every number and timecode checked against the artifact: correct. |
| 9037203039, Bounty Hunter pos 4, win 41:14, 7/13/22 | "briefly: why did I die so much?" | 12 of 13 deaths outside big fights; killers by count; four deaths within a minute of the player's own wards as a medium-confidence hypothesis; advice and drill on counting enemies before warding. 255 words. Numbers correct. The ward hypothesis was weak: with 23 wards placed, a third of the match was "within a minute of a ward", so 4 of 13 is what chance gives. The source policy now requires a base rate for such co-occurrence. |

Rule changes from their notes: `--mode` shown in the review-check command; brief and focused shapes defined; computed counts and sums allowed; deaths may be grouped by the agent and weighed by cost; a Russian phrasing for "outside a recorded teamfight"; seconds dead end at a buyback; the review check warns above the usual length and counts words like `wc`.


# Source policy

The review keeps three things apart: **facts** from the artifact, **labelled advice and hypotheses**, and **unknowns**. Strict facts protect the player from invented numbers; labelled advice is what makes the review useful.

## Sources

| What | Source | Limit |
|---|---|---|
| Scoreboard, all ten players, items, purchase times, wards, buybacks, skill build, objectives, team economy, recorded teamfights | OpenDota (parsed replay for everything but the scoreboard) | logged events locate what happened, not why |
| Selected player's deaths: time, killer, seconds dead, gold lost, fight involvement | OpenDota `deaths_log`, or the other players' kill logs on older parses | no position outside recorded fights, no item or ability uses |
| Lane, position, roaming flag, lane numbers at 10:00 | OpenDota estimate; STRATZ when its token is set | an estimate from early positions |
| Percentiles of the player's whole-match rates | OpenDota benchmarks | see Comparisons |
| Positions, item and ability uses, teleports, death contexts, peer means, lane result label | STRATZ, with `STRATZ_API_KEY` | per-capability; missing playback leaves them unavailable |
| Exact current sub-patch | Valve patch list | unverified means no review |
| Hero, ability and item mechanics | Valve datafeed for the current patch, in the artifact | explains a recorded fact, never supplies match state |
| Personal progress | saved artifacts through `--history-dir` | same account, hero, position, mode and patch |

Matches on an earlier sub-patch are rejected; the skill never reviews them.

## Facts, hypotheses, advice, unknowns

- **Fact:** a value or event in the artifact, with its time or interval. Quote it as recorded.
- **Hypothesis:** a cautious explanation of a fact. Allowed when **at least two independent facts** point the same way, labelled ("гипотеза", "probably") with a confidence word, and with the facts named. Example: three deaths to the same two enemy heroes, all outside recorded fights, plus the roaming flag → "probably caught while moving between lanes; check the minimap before moving (hypothesis, medium confidence)". A repeated observation alone is a pattern to point at, not yet an explanation.
  - Confidence words: **high** when the facts nearly force the reading (four of five deaths to the same hero as the first death of the team in a fight); **medium** when two independent facts agree but another reading is plausible; **low** when one strong fact meets a weak one. Without two facts, don't hypothesise.
  - Co-occurrence needs a base rate. A death within a minute after the player's own action (a ward, a purchase, a buyback) counts as a fact for a hypothesis only when it happens far more often than chance would give: a support who placed 23 wards in 41 minutes was "a minute after a ward" for a third of the match, so 4 of 13 such deaths is what chance predicts. Say so, or leave it out.
- **Advice:** what to do differently, from the [coaching playbook](coaching-playbook.md) and general Dota knowledge, labelled "Совет тренера" / "Coach's advice", tied to a stated fact, never presented as something measured in this match.
- **Unknown:** `null`, an unknown name, a closed capability, an unavailable source. Never write it as "no", "none" or "did not happen". A conflict between sources is named, not silently resolved.

Never state as fact what match data cannot contain: what the player saw or intended, vision at a moment, enemy cooldowns, mana or health, whether a spell or item was ready, or that a different action would certainly have worked. Advice may still say "if X, then do Y".

An item-use event proves the use, not its target, direction or effect. A purchase proves a purchase, not a good build; advice may still say what a coach would buy, as advice.

## Comparisons

Four kinds, each with its own wording:

| Kind | What it is | How to use it |
|---|---|---|
| Lane opponents and all ten players | the same match's values: last hits, net worth, items and timings at 10:00 or at the end | a direct factual comparison: "at 10:00 you had 4 last hits, Medusa 44" |
| Peer mean (STRATZ) | the mean for the same hero, position, rank bracket and current-patch weeks, with its sample size | "STRATZ sample mean for <hero> <pos> in <bracket>: …, N matches"; name a rank mismatch; it can support a numeric target only when the bracket matches the player |
| OpenDota percentile | the player's whole-match per-minute rate ranked against the same hero's players in public matches OpenDota sampled in about the last hour; every position mixed; no sample size; Turbo against Turbo | rough context only: "GPM about the 62nd percentile for this hero on OpenDota (all positions)"; never a target; skip it for a hero often played in another role; for deaths a higher percentile means fewer deaths |
| Coach's rule of thumb | a figure one coach gave in the playbook | advice only, with its condition; never a norm the player failed |

A numeric target the player "should" reach needs the peer mean with a matching bracket, the lane opponents' values, or the player's own history. Turbo and non-standard modes have no normal-game norm; the runtime leaves the peer mean unavailable for them and labels phases as clock intervals.

## Match context

- **Team economy:** per-minute team difference from the selected side (earned gold, XP, net worth when every player recorded it). A swing or leader change is a measured change over its minutes; what happened inside it co-occurs with it.
- **Objectives:** the recorded last hit on a building, Roshan, the Tormentor, the Aegis, first blood, couriers. Participation is known only for the recorded killer or carrier.
- **Wards:** placements and when each ward left the game. Not vision, not a location name, not dewarded or expired.
- **Abandons:** the artifact lists players who abandoned; say the teams were uneven and treat totals and comparisons with that in mind.

## Names, language, ownership

Use the user's language. Hero, item and ability names as the artifact spells them; an unknown one is "unknown hero/item", never an ID or a guess. Keep field names, capability names, error codes and internal IDs out of the review. Select by account when known; a hero- or slot-only selection uses third person ("игрок на Skywrath Mage") unless the user said the match is theirs.

## Secrets and raw data

Never ask for a token in chat or write one anywhere. Raw API responses and headers never enter a review or an artifact.

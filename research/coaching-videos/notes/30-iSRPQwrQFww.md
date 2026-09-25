# 30 · BSJ: on today's big map, showing on a wave is information

- **Video:** [Your Idea of Farming is Outdated](https://youtu.be/iSRPQwrQFww) · BSJ · 2026-06-24 · 14 min · English
- **Patch at publication:** 7.41d. Hero and item examples are left out.
- **Type:** macro guide on how the larger map changed farming and ganking
- **Source:** auto-generated captions only

## Core idea

On the old, smaller map each team controlled half, and a player who showed on a wave had one or two places to go. A team could find enemies by elimination: search their side, and if nobody is there, they are in base.

Today's map has more outer camps and twin gates, so a hero who leaves a wave has several routes and can hide. That makes every appearance on a wave costly: it tells the enemy where to start searching.

- The better team clears waves quickly and from a distance ("ghost pushing"), ideally without showing its hero.
- Ganks are made by predicting where and when the enemy will show, not by searching.

## Findings

### F1 · 0:30–6:47 · midgame · elimination no longer finds enemies

**Claim.** With twice as many farming areas, searching the enemy's side no longer proves they are in base; a failed smoke may just mean they farmed another camp. Finding a hero you haven't seen recently is much harder than it used to be.

**Signal — not observable.** Vision and fog of war are not recorded.

### F2 · 6:47–9:21 · midgame · push waves without showing

**Claim.** Clear waves as fast as possible, from range, and leave. When the enemy clears waves faster, your team has no decisions left: you never see their heroes and your lanes are always pushed in. The counter is heroes or items that clear waves faster or without showing your hero.

**Signal — not observable.** Wave clear and visibility are not recorded. The player's lane last hits are collected in `events.cs` but not published.

### F3 · 9:21–10:24 · midgame · gank where the enemy will clear the wave

**Claim.** Most deaths happen while showing on a wave for too long. To gank a hero who clears from range, wait where he will stand to clear it, not on the wave. If you haven't predicted it in advance, it is usually too late.

**Signal — derivable.** Where the player stood at each death relative to the lane, from `deathAnalysis.contexts` positions. Waves are not recorded.

### F4 · 10:24–12:29 · midgame · the last place you were seen is where the search starts

**Claim.** A common mistake below about 5K: show on a wave, farm the two nearby camps, then come back to the same spot. The enemy starts searching exactly where they last saw you. High-MMR carries play whack-a-mole: after showing, they move so the next appearance is somewhere unexpected.

**Signal — derivable.** Repeated returns to the same area after showing, from the position row. Visibility itself is not recorded.

### F5 · 12:29–13:00 · items · the first items are a plan for approaching waves

**Claim.** Plan the first two or three items around three questions:
- How long does it take me to clear a wave?
- From how far away can I clear it?
- Which enemy can kill me while I do it?

**Signal — observable.** Purchases and times from `items.purchases`, the enemy lineup from `draft`, and item texts from `mechanics.items`. The plan's fit is a review judgement.

## Exercises the coach gave

None.

## Not taken

- The hero and item examples of ranged wave clear (7.41d).
- The linked coaching series.

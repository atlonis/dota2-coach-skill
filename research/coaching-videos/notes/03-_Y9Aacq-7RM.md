# 03 · BSJ coaches a 2,200 MMR mid player

- **Video:** [BSJ Dota 2 Coaching 2200, Mid](https://youtu.be/_Y9Aacq-7RM) · Dota Dojo · 2026-04-21 · 65 min · English
- **Patch at publication:** 7.41b. Item examples illustrate the principle, not current builds.
- **Type:** paid coaching session, two replays; the player chose his best recent game and a loss he could not explain
- **Subject:** position 2 at about 2,200 MMR, a returning player who once peaked around 5–6K. His stated goal was enjoying the game, framed as "Dota CBT": does my behaviour produce the outcome I want?
- **Source:** auto-generated captions only

## Main finding

The coach judged the player's game sense as better than his bracket. The gaps were translating that sense into the present moment. The player held back from actions without naming the exact reason, so he missed the moments when that reason was absent. His items did not serve what he was actually doing on the map.

## Findings

### F1 · 10:18–13:25 · lane · name exactly what stops you

**Claim.** The player tended to hit the enemy only when he felt ahead and never when he felt behind. The coach's fix is to name the specific threat. For example, "the enemy's stun" replaces "I can't take ranged creeps", and the restriction becomes "don't stand in melee range of that hero". A named reason gives an accurate decision instead of a blanket one.

**Signal — partly observable.** Hero damage per phase in `phases`, including the lane phase, shows whether the player traded at all. Individual hits on heroes and the threat itself are not observable.

### F2 · 14:25–18:40 · lane · when the reason is absent, act at once

**Claim.** Not hitting the tower against a mid who defends it well is usually right. But the rule has an exception: when that mid is dead with no teleport, the reason is gone. That window is the only chance, so urgency should jump. The coach's image: every enemy hero holds up a wall, and you cross when the wall is down.

**Signal — partly observable.** Kills per phase come from `phases` and the tower's destruction time from `objectives`. Kill times are collected in `events.kills` but not published. Hits on a tower over time are not recorded.

### F3 · 20:07–23:45 · lane to midgame · when a mid should leave to gank

**Claim.** A mid should gank for one of two reasons. Either the lane is not worth staying in, or he dominates it with resources to spare for both farming and killing. Leaving mid with low resources while winning it, just before runes, hands mid control and the runes to the losing opponent.

**Signal — derivable.** Rune pickups come from `events.runes`, and the player's position leaving mid from the position row, set against rune times. Resources are not observable.

### F4 · 24:43–33:40, 56:10–57:45 · midgame · item order for a mid

**Claim.** The first item, costing roughly 2–3K gold, should speed up how the hero kills creeps, since even a mid spends most of this stage last hitting. Ideally it also helps against heroes. The second item makes fighting better: getting to fights, surviving in them, entering them, or dealing damage in them. Ask of every purchase whether it serves what you are doing on the map right now.

**Signal — observable.** The purchase order and times come from `items.purchases`, and item effects from `mechanics.items`. The fit to the plan is a review judgement.

### F5 · 34:08–38:35 · midgame · after a fight, check the waves

**Claim.** When a fight is over and spells are spent, the first check is the lane waves, not Roshan or another fight. "However long it takes you to teleport to that free wave is your MMR." Waves are the state of the game; keeping lane equilibrium is what enables towers and Roshan.

**Signal — derivable.** From the end of each OpenDota teamfight interval to the player's next wave last hits in `events.cs` or next teleport in `events.repositions`. Not computed yet.

### F6 · 38:35–41:45 · midgame · against a teamfight lineup, push and choose

**Claim.** Against a lineup with strong teamfight but little pick-off, push the lanes from a safe distance. Connect to fights only when they look good, so every fight is a choice made while farming. A hero that can catch lone players shifts this toward teleporting to the team earlier.

**Signal — derivable.** The player's last hits and position in the minute before each teamfight. Not computed yet.

### F7 · 51:00–56:10 · midgame · items against a team that will run at you

**Claim.** When your side has farming heroes who will not start fights, expect the enemy to run at you, and buy for that: something to survive or to hit back. The fights that followed were at the player's own towers, so a mobility item for joining far fights was unnecessary. Match the item's theme to what the game is actually doing.

**Signal — partly observable.** Purchases and `objectives` for where the fights happened, own towers lost. How willing the team is to start fights is a review judgement.

### F8 · 1:01:20–1:04:25 · midgame · areas that give only gold

**Claim.** Some areas of the map, such as the lane far from the enemy's side, give one team nothing but gold. Farming them is fine for efficiency, but holding them "for control" does nothing. A strong hero belongs where his presence threatens something.

**Signal — derivable.** Time spent by map region from the position row. Not computed yet.

## Coaching method

- He asked why the player chose each replay: his best game, to look for hidden macro errors, and a loss he could not explain.
- He adopted the player's own frame, "what outcome do I want, does my behaviour produce it?", and turned findings into awareness rather than fixes.
- He repeatedly said the player's instincts were right and only the items and the named reasons needed syncing.
- He pointed the player to other sessions that covered the same idea.

## Exercises the coach gave

- When you hold back from an action, say the exact reason. The moment that reason is gone, act.
- After every fight where you spent your spells, check the lane waves before anything else.
- For each item, ask: does it make me hit creeps faster, or make my fighting better, given what I am doing right now?

## Not taken

Specific item builds for the heroes in these games (7.41b), and the coach's remarks on how an innate ability changed that patch.

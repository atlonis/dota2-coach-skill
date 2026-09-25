# 19 · A 14K coach reviews his own support game

- **Video:** [Как правильно саппортить? 14к тренер ДУШНО разбирает каждую свою ошибку](https://youtu.be/sqicoyFqlBs) · Common Sense Dota · 2026-03-24 · 100 min · Russian
- **Patch at publication:** 7.40c. Hero spells and item choices are left out.
- **Type:** self-review. The coach watches his own replay of a position 5 game he was unhappy with, thinking aloud about each decision.
- **Subject:** position 5 Ringmaster in a high-MMR lobby. His own questions: why his wards were broken so fast, why he found almost no enemy wards, whether his build and spell usage were right, and whether he was where he should be.
- **Source:** auto-generated captions only

## Core idea

The video shows the method of a self-review more than its conclusions. For each moment the coach asks what he should have been thinking, whether he had time to think it, and how to free that time next game. His conclusions:

- **Laning was poor:** he blocked the wrong camp, leaving the pull camp blocked and the big camp open, and made a bad teleport that left his carry alone.
- **Vision needs planning ahead**, with sentries bought before observers.
- **Spell usage was average.**
- **The build was fine.**

His main discovery was that he had searched for "genius" enemy wards that did not exist. The enemy had mostly placed default wards, or none at all.

## Findings

### F1 · 1:31–5:09 · pre-game · what a position 5 thinks about from second one

**Claim.** From the first second, decide:
- the starting items;
- the smoke: whether, where, and for what;
- where the first observer goes;
- how the lane contests the ranged creep, and which spell is saved for defence;
- which camps to block and unblock;
- which lane can be pressed;
- the win condition.

In this game the win condition was the carry's and the mid's items, and the enemy mid's lack of items.

**Signal — partly observable.** Starting purchases come from `items.purchases`, the first wards from `wards`, and the draft from `draft`. The plan itself is not recorded.

### F2 · 7:12–10:21 · lane · manage camps and sentries

**Claim.** Know which camp to block and which to unblock. Pulling the wrong one left the pull camp blocked and the big camp open. Sentries give a short burst of vision when placed, so a sentry placed next to your fresh observer reveals it. Buy two sentries, not one, when you need both an unblock and a deward.

**Signal — partly observable.** Sentry and observer placements come from `wards`. Camp states are not recorded.

### F3 · 15:29–17:33 · lane · cancel a teleport that is no longer useful

**Claim.** A teleport that arrives after the ally is dead costs the teleport, the mana, and the lane you left. That lane here was the carry, who could not stand alone. Watch the minimap more, and cancel the teleport the moment its target is dead.

**Signal — derivable.** A teleport in `events.repositions` that ends after the ally it went to help has died, together with the carry's last hits in the minutes after. Not computed yet.

### F4 · 18:05–26:20 · early game · automate the routine to free attention

**Claim.** He failed to think about his next ward because his attention was on a stack timing he did not know by heart. The fix is to drill stack timings in a demo lobby until they are automatic. Then the walk between lanes becomes the moment to plan the next ward, rune, watcher and save. The best early observer is one planned before it arrives, with a sentry to clear its spot first.

**Signal — partly observable.** Ward placement times come from `wards`. Stacks are not recorded.

### F5 · 26:20–31:02, 38:16–39:00 · early game · the enemy's vision follows a pattern

**Claim.** If enemies attack in an area, they have an observer there. Deward it by habit, with sentries covering first the likely spots and then the less likely ones. An enemy who is suddenly revealed, or seen carrying two observers and later one, has just placed a ward nearby. Default ward spots get dewarded; an unusual spot survives.

**Signal — not observable.** Enemy wards are not in the artifact. Our own sentries are in `wards`.

### F6 · 33:06–34:38 · teamfight · price your spells when mana is short

**Claim.** With limited mana, cast the spell with the most impact in this situation. Defending needs the save and the resistance spell, not the damage spell. The three seconds of a teleport are the time to plan which spells to use on arrival.

**Signal — partly observable.** The player's ability uses and times come from `events.abilityUses`. Mana is not observable.

### F7 · 47:31–54:20 · midgame · choose items by the role the game leaves you

**Claim.** When the enemy's disable makes your saves useless and two teammates already initiate, work out what your role is before buying. Check what high-MMR players buy on the hero in similar games, but judge by your own net worth and timings. An aura item nobody on the team has is worth considering. Buying it at 25 minutes may be too late to matter.

**Signal — observable.** Purchases and times come from `items.purchases`, the draft from `draft`, and item texts from `mechanics.items`. The choice is a review judgement.

### F8 · 59:31–1:00:34 · mentality · failing to find a ward is not a tragedy

**Claim.** Not finding a ward has only two causes: a bad sentry spot, which the replay will show, or a bad enemy ward that is barely useful. Think like a winner, not like a victim, and don't tilt over it during the game.

**Signal — not observable.** No mental-state data.

### F9 · 1:28:56–1:38:20 · teamfight · don't jump without checking the fight state

**Claim.** Before jumping into a fight, check whether your carry has his ultimate, whether your damage dealer is already dead, and where the fight actually is. He spent two key spells on a fight that had already moved to the other side of the map.

**Signal — partly observable.** Deaths and nearby allies from `deathAnalysis.contexts`. Allies' cooldowns are not observable.

## Coaching method

- Self-review with explicit questions at each moment: what should I have been thinking, did I have time, what would have freed that time.
- He checks the enemy's point of view in the replay to confirm or refute his in-game guesses about their wards.
- He tests an uncertain fact, such as a ward's line of sight, in a demo lobby.
- He closes with a short list of what to improve and what to keep.

## Exercises the coach gave

- Drill all camp stack timings in a demo lobby until they are automatic.
- When enemies attack an area, deward it with two sentries: the likely spot first, then the less likely one.
- Plan the next observer, and the sentry that clears its spot, while walking between lanes.

## Not taken

Hero spells, specific ward coordinates, neutral item choices and the item decision for this hero (7.40c).

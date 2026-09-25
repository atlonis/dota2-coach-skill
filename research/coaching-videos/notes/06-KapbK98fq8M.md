# 06 · BSJ reviews a 5,100 MMR mid replay

- **Video:** [BSJ Dota 2 Replay Analysis: 5100, Mid](https://youtu.be/KapbK98fq8M) · Dota Dojo · 2026-04-14 · 28 min · English
- **Patch at publication:** 7.41b.
- **Type:** recorded follow-up replay analysis without the player present. The player had climbed from 4,600 to 5,100 since his session.
- **Subject:** position 2 Puck in a hard lane, at about 5,100 MMR. The player's question: early fights went well, then fights stopped working, and he didn't know when to stop fighting.
- **Source:** auto-generated captions only

## Main finding

The fights were not the problem. They were senseless because the lanes were not pushed before and after them.

Each time the team won a fight, it lingered and hit tier-2 towers instead of taking the free waves. The enemy regained map control, and every fight had to be won again. A lead of about 4K became a deficit of about 4K.

The coach's prescription keeps the player's appetite for good fights, with an added constraint: optimise clearing waves between fights.

## Findings

### F1 · 1:34–2:40 · lane · pair the enemy ranged creep with your own

**Claim.** When you go for the enemy's ranged creep while your own ranged creep is at the tower, draw aggro to bring your creep with you. Otherwise you trade one ranged creep for another missed one. Pulling the wave toward yourself also lines it up with your own attack modifier.

**Signal — partly observable.** Last hits and denies by minute from `series`. Creep aggro is not observable.

### F2 · 4:14–5:50 · lane · short of your power level, shove and leave

**Claim.** One level short of your kill threat in a lane you are losing, shove the wave as fast as possible and take a camp to hit the level early. Sitting in lane invites exactly the interaction you do not want. Once at the power level, you can hold the lane and welcome a fight.

**Signal — partly observable.** The level timing is derivable from `series.xp`, and the player's position after the wave from the position row. Deaths before the level come from `deathAnalysis.contexts`.

### F3 · 7:24–8:00 · lane · bait when you want the fight

**Claim.** When you do want the enemy mid to engage, drag the wave with you, for example toward the rune, and let him come to you. Reacting by attacking him head-on works worse.

**Signal — not observable.** Creep dragging and intent are not recorded.

### F4 · 11:03–14:43 · midgame · no tier-2 towers while waves and camps are free

**Claim.** The coach has "officially banned" hitting tier-2 towers before about 20 minutes unless every wave is cleared, every nearby camp is taken, and there is nothing else to do. After a won fight, teleport to the far wave, push it out, and loop back toward the team. Then the enemy respawns into a map they cannot contest. Lingering hands the map back in seconds.

**Signal — derivable.** Time from the end of each won OpenDota teamfight interval to the player's next wave last hits, and tower events in `objectives` in the same window. Not computed yet.

### F5 · 15:13–19:30 · midgame · the lanes decide whether a fight makes sense

**Claim.** When your team is winning, fix the lanes before doing anything else. A fight taken with lanes pushed has a hedge: a good fight leads to more, a bad one costs less. Without pushed lanes every fight is a gamble. Against a team with strong teamfight, the hero who clears waves fastest is the one the enemy needs to kill. Walking into them instead of pushing delivers that hero to them.

**Signal — derivable.** The player's wave last hits in the minute before each teamfight. `teamEconomy` shows the lead turning.

### F6 · 19:59–21:32 · midgame · teleport only when you won't need to walk back

**Claim.** Teleporting to a far lane just before your teammates respawn means walking back to them for the next fight: an 80-second commitment for three creeps. Teleport only when you are sure you won't need to walk to your team for the length of the teleport cooldown.

**Signal — derivable.** A teleport in `events.repositions`, then the player arriving late to the next OpenDota teamfight interval. Not computed yet.

### F7 · 23:38–27:20 · method · grow by adding a constraint

**Claim.** To improve, keep what you already do and add one constraint. For a farming carry, farm efficiently but away from the team when you don't want to fight, and toward it when you do. For this mid, keep looking for good fights but clear waves between them: before a fight to set it up, and after to set up the next.

**Signal — not observable.** This is a coaching frame, not a match fact.

## Coaching method

- He opened by recalling the previous session's topics, communication and urgency during fights, and checked for them first.
- He named the player's swing: after being told to split-push, the player moved back to his natural tendency to fight at all costs.
- He apologised for his own frustration on air and "took accountability" that his earlier message had not landed.

## Exercises the coach gave

- Before and after every fight, find the extra wave you can clear.
- Hit no tier-2 tower until waves and nearby camps are cleared.

## Not taken

- Item order remarks for this hero (7.41b).
- The note that one enemy hero lost range at level one this patch.

# 13 · Daxak reviews a 5,000 MMR carry (Ursa)

- **Video:** [РАЗБОР 5.000 КЕРРИ](https://youtu.be/ZPtgItnXVkA) · Daxak Dota · 2026-07-11 · 23 min · Russian
- **Patch at publication:** 7.41d. Item and hero specifics are excluded below.
- **Type:** coaching review of a submitted replay
- **Subject:** position 1 Ursa, player at about 5,000 MMR with a losing win rate; coach is a high-MMR streamer (about 16K by his channel)
- **Source:** auto-generated captions only; on-screen moments are referred to as "here", so exact map context is lost

## Main finding

The coach's verdict is that the player's decisions were individually plausible but the overall picture was wrong. He named two problems and ranked the lane first:

1. **Lane control was abandoned.** The player skipped regeneration in a hard lane, pulled neither camp, and contested lotuses without any resource or level advantage.
2. **The player played as a second aggressor, not as the plan B carry.** While his team was already winning fights, he kept showing himself on the map, joined fights that had no objective, and hit a tower that gave nothing. The coach's alternative was to farm the empty parts of the map and stay unseen until a deliberate move.

## Findings

### F1 · 0:30–1:30 · lane · plan for a hard lane

**Claim.** With two melee heroes against a ranged, nuke-heavy lane, the lane task is to survive: deward and pull together, avoid trading under the enemy tower, and wait for a rotation or leave to the jungle with a teleport.

**Signal — partly observable.** `lane.opponents`, `lane.selectedSideOutcome`, last hits at 10:00 against the baseline, and deaths before 10:00. A jungle exit is only derivable: we have the position row, but the runtime does not compute it yet.

### F2 · 1:30–2:30 · lane · starting items for the matchup

**Claim.** The starting buy should match the lane. Movement boots give both aggression and safety. In a lane without sustain, health regeneration comes first.

**Signal — observable.** `items.purchases` from the pre-game window, now kept. The matchup is in `lane.opponents`.

### F3 · 2:30–3:30 · early game · fight for an objective or farm

**Claim.** Every stage has its own objectives: lotuses, lane control, the fifth-minute timings, night, towers. A fight that is neither quick nor for an objective loses to farming creeps.

**Signal — derivable.** Teamfight intervals in `events.teamfights` against `objectives` and against the player's last-hit rate in the same window. It is not computed yet.

### F4 · 3:30–5:10 · lane · pick the moment by resources and levels

**Claim.** Commit at a level or resource advantage, for example reaching level 3 first with full resources. Here the player attacked with no advantage and also missed last hits and denies.

**Signal — partly observable.** Last hits and denies at 3:00 and 5:00 from `series`. XP relative to the lane opponents is derivable from OpenDota for all players, but not exposed. Resources such as mana and cooldowns are not observable.

### F5 · 5:40–6:40 · lane · the carry farms the pulled camp

**Claim.** The pulled or stacked camp is the carry's safe farm. Letting the support take it gives away experience and gold at no benefit. Stacking the small camp is usually wrong for the carry.

**Signal — derivable.** Not in the artifact. OpenDota `camps_stacked` exists but is not extracted. Pull events are not recorded.

### F6 · 8:45–10:20 · midgame · aggressive team means a passive carry

**Claim.** When the team is winning fights and does not need the carry, the carry should farm the parts of the map nobody else is using. Otherwise he takes the camps his teammates would have farmed. As plan B, pick the farming path that maximises creeps, and choose items and talents for farming.

**Signal — derivable.** The player's `events.cs` neutral kills and positions against the team's fights. `teamEconomy` shows whether the side is ahead. Farm efficiency comes from last hits per minute by phase in `phases`.

### F7 · 8:15–8:45, 14:59–15:30 · midgame · pointless structure hits

**Claim.** Hitting a tower that opens nothing, instead of the one allies are hitting, wastes the carry's time.

**Signal — observable.** `objectives` records the building's last hit and whether the selected player is involved. Time spent hitting a tower is not observable.

### F8 · 10:50–12:30 · midgame · Roshan timing

**Claim.** Take Roshan when the team is right next to it, even without a plan to end. The first kill sets up the second Roshan, with its banner, for the time of the double catapult waves.

**Signal — observable.** `objectives` records Roshan kills, the Aegis carrier and times.

### F9 · 20:10–22:40 · midgame · map presence as information

**Claim.** A solo-kill carry should not show on every wave. Being unseen makes every enemy who walks out alone a target. Show yourself only on purpose, for example so a second initiator can start. Appearing at random is a coin flip.

**Signal — not observable.** We have no enemy vision data. A weak proxy is time on enemy-side waves from the position row, which is not computed.

### F10 · 16:30–17:40 · teamfight · positioning against a big-area ultimate

**Claim.** Five players standing together against a wide ultimate lose the fight. Only the designated initiator should stand exposed.

**Signal — partly observable.** Allies near the player at a death from `deathAnalysis.contexts`. Ally spacing outside deaths is not computed.

## Coaching method

- He opened by asking the player how he read the draft and the lanes, before showing anything.
- He had the player grade his own decisions ("how would you rate this out of ten?").
- He probed with questions such as "what does this tower give you?" until the player named the missing reason himself.
- He closed on one frame: the overall picture matters more than any single detail, and a correct phrase applied to the wrong situation is still a mistake.

## Exercises the coach gave

- Learn the simplest lane approach for your role first, then what your hero must do each stage. Do not attempt advanced plays before that.
- Before joining a fight, name its objective. With none, and if the fight is not quick, keep farming.
- When your team is ahead and aggressive, farm the empty side of the map instead of joining.

## Not taken

Named item recommendations and the talent choice. They are 7.41d and hero specific; current mechanics come only from the datafeed. Also left out: the coach's banter and profanity.

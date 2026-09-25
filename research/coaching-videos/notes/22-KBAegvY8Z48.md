# 22 · Daxak reviews a high-MMR "booster" playing mid

- **Video:** [ДАХАК РАЗБИРАЕТ ИГРУ 8К ММР БУСТЕРА С 8300 ОТЗЫВАМИ](https://youtu.be/KBAegvY8Z48) · Лучшее с Дахаком · 2026-05-03 · 134 min · Russian
- **Patch at publication:** 7.41b.
- **Type:** a replay review of about 35 minutes, then live games with comments
- **Subject:** position 2 Windranger in a lobby of about 5K, played by an account booster who says he has reached 8,500. He describes his style as aggressive but safety-first.
- **Source:** auto-generated captions only. This note covers the replay review in detail and samples the live part, which is mostly commentary on new games.

## Main finding

The coach's verdict: the player's kills were random and his play was "PvE mode":

- he did not hit the enemy mid at all while claiming to play aggressively;
- he did not push the wave for rune timings;
- he walked the map without a teleport;
- he skipped waves out of fear of the enemy's big ultimate.

Four lucky kills masked a lane that would otherwise have left him at about 3K net worth at 10 minutes. With proper runes, pushing and farm, 4K or more was available against any opponent.

## Findings

### F1 · 1:33–4:40 · lane · it is a PvP game: hit the enemy mid

**Claim.** "There is no hero you can't beat in mid." Against a strength hero with two armour, a ranged attacker who never hits him has no lane. The player waited for his level-6 ultimate instead of trading from the start. Level the lane-winning spell early, and buy a bottle.

**Signal — partly observable.** Hero damage in the lane phase from `phases`, and the skill order in `skillBuild`. The opponent's health is not recorded.

### F2 · 3:38–4:40, 9:29–10:32 · lane · push the wave for every rune timing

**Claim.** For the 2, 4 and 6-minute water runes, always push the wave first. Then even an enemy support coming to contest cannot stop you. When the enemy mid leaves for water, push your own wave so he loses creeps. When waves meet and you have a setup, attack; standing idle is waste.

**Signal — partly observable.** Last hits by minute come from `series`. Rune pickups are collected in `events.runes` but not published. Wave pushing is derivable from positions and `events.cs`.

### F3 · 4:40–5:45, 10:32–12:05 · lane · don't walk under the enemy tower blind

**Claim.** Dive only with information. Walking under the tower with the enemy support unseen, or pressing the enemy for 15 seconds while any rotation can arrive, is a free death. Blocking the mid wave and holding lane control is the precondition for any aggression.

**Signal — derivable.** Deaths near the enemy tower in `deathAnalysis.contexts`, with nearby enemies and their positions.

### F4 · 8:26–9:29, 16:10–18:40 · early midgame · kills without farm are random

**Claim.** He was 4:0 by minute 9, but without resources, without a teleport, in the wrong place. Take out any one of those kills and his game is poor. A kill is not a plan.

**Signal — observable.** Kills, deaths and last hits by phase come from `phases` and `baseline.comparisons`. `teamEconomy` gives the context.

### F5 · 18:40–23:30 · midgame · act only after the lanes are pushed

**Claim.** Make moves only after pushing the lanes. Pushing waves also creates information, because the enemy has to show up on them. With all five enemies visible, the player farmed jungle instead of the free wave. He feared the enemy's big ultimate even when its owner was visible far away.

**Signal — derivable.** The player's lane and neutral last hits in `events.cs`, against the times all enemies were far away, from positions.

### F6 · 23:26–25:00 · any stage · always carry a teleport

**Claim.** Running around for 17 minutes with no teleport is unacceptable. It cost a kill on the enemy carry and made him miss fights.

**Signal — partly observable.** Teleport purchases are in `items.purchases`. Teleport uses are collected in `events.repositions`, but the artifact publishes only the last one before a death. The stock at any moment is not recorded.

### F7 · 28:37–30:45 · midgame · buy against what can kill you

**Claim.** The player skipped the immunity item because some enemy spells pierce it. That ignores the many that don't, such as disables and burst. Know the enemy's threats and buy for them.

**Signal — observable.** `items.purchases` and `mechanics.items`. The fit is a review judgement.

## Coaching method

- He challenged the player's self-description ("aggressive", "a strength hero can't be harassed") with numbers from the replay: armour, attack damage, the opponent's regen charges.
- He offered to prove the point by playing the matchup against the player himself.

## Exercises the coach gave

- For every early rune timing, push the wave first.
- Never leave the fountain without a teleport.

## Not taken

- The item and build debate for this hero (7.41b).
- The discussion of bought accounts and the advertisement.
- Most of the live commentary.

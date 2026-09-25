# 23 · A 15K coach live-coaches a 5.5K carry

- **Video:** [Я ЗАКАЗАЛ 15К ММР ТРЕНЕРА ПО ДОТЕ И НЕ БЫЛ ГОТОВ...](https://youtu.be/5xia5xLiurE) · Lemchanskiy · 2025-08-25 · 31 min · Russian
- **Patch at publication:** 7.39d. Hero, facet, neutral item and build choices are left out.
- **Type:** live coaching during one ranked game, with questions between moments and a summary at the end
- **Subject:** position 1 Ursa. The player is a streamer who peaked at 6,400, is now about 5,500, and calls himself mentally unstable.
- **Source:** auto-generated captions only; the coach and the player talk over each other

## Main finding

The coach's verdict: the game was lost on farm, not on fights.

- The player left the lane with about 4,500 net worth and finished his first big farming item at minute 15. The coach puts the usual timing at 12–13, and 11 was possible here.
- Every later item came about four minutes late.
- Every later death was "by a hair": a level, an item or a talent short.
- At the end his net worth was 19K against the enemy carry's 27K.

His rule: a carry just needs to be big and not die. A player who lanes weakly but farms well and doesn't die can still climb.

## Findings

### F1 · 1:35–3:40 · mentality · having something to think about leaves no time to tilt

**Claim.** Stability comes from game intelligence. When there is always a task, such as pushing lanes after a death, gathering information or calling a smoke, there is no time to tilt. Low-MMR players see only the minuses: a support dies while the enemy carry dies for it, and they are still angry. Muting chat helps you think about the game instead of arguing.

**Signal — not observable.** No chat or mental-state data.

### F2 · 3:40–4:43 · draft · play your signature hero, not the meta one

**Claim.** A meta hero you can't play loses to your own best hero. At high MMR the strongest heroes are first-picked, so the last pick takes what is left of the pool.

**Signal — partly observable.** The picks are in `draft`. The player's hero history is only in `progress`, when history is requested.

### F3 · 4:43–6:17 · lane · plan the level-2 kill

**Claim.** Against two fragile lane opponents, the plan is the level-2 power spike:
- hold the first wave;
- push the second so level 2 comes earlier;
- don't let the enemy deny both ranged creeps;
- attack with the level-2 combo when an enemy walks close.

Whether to trade instead of last hitting depends on the distance to the towers and on whether the hero can close the gap.

**Signal — partly observable.** XP and last hits by minute come from `series`. The level-2 time is derivable from `series.xp`, and lane kills from `phases`. Wave pushing is not observable.

### F4 · 9:56–11:00 · early game · farm the big camp from the lane

**Claim.** The coach sees a difference between high- and low-MMR carries in his students' replays. Low-MMR carries don't farm the big camps or stack until minute 9–10, even when they can. Pull or push the lane wave into the big camp and farm both. Don't chase an enemy you can't kill; push and farm.

**Signal — derivable.** Neutral last hits by minute from the `isNeutral` flag in `events.cs`, collected but not published.

### F5 · 11:29–12:00, 22:50–23:22, 26:56–27:58 · farm · keep a last-hit target in mind

**Claim.** The coach's benchmarks for this farming carry:

| Minute | Last hits |
| --- | --- |
| 10–11 | about 80 |
| 22–23 | about 300 |
| 25 | 350 |
| 35 | about 500 |

200 missing creeps at about 30 gold each is 6,000 net worth. Don't judge by the lane, which varies, but set a target for 25 minutes and hold it in your head all game. Thinking about the number makes you farm faster.

**Signal — observable.** `series.lh` by minute and `baseline.comparisons` against peers on the same hero, position and rank. The coach's numbers are one hero's targets, not a norm.

### F6 · 7:51–8:22 · any stage · which deaths break a game

**Claim.** Deaths in lane to a gank or a hard matchup are easy to come back from. Deaths at 15, 20 or 25 minutes from overdiving, not from being ganked, break the game.

**Signal — observable.** Death times and contexts come from `deathAnalysis.contexts`, and deaths by phase from `phases`. Whether a death was an overdive is derivable from positions near enemy towers.

### F7 · 12:00–12:30 · teamfight · call teleports by name

**Claim.** Don't just say "teleport". Say "you, teleport" to the player who has one. A general call makes each player assume someone else will go. Check the scoreboard with Alt to see who has a teleport.

**Signal — not observable.** No chat or voice data.

### F8 · 13:00–14:32 · early midgame · farm until the key item, but keep the lane and the enemies in mind

**Claim.**
- Before the key item, only your tower and a very low-health enemy nearby matter; everything else is farm.
- Farming far from your side is safe up to about 5K. Above that, carries don't do it, or they ward first.
- The player sometimes forgot the free lane while all five enemies were visible in mid. Think about where the enemies are.

**Signal — derivable.** Lane and neutral last hits against the enemies' positions, from `events.cs` and the position rows. Not computed yet.

### F9 · 14:32–15:04 · midgame · plan the next objective ahead

**Claim.** Know where you need to be by minute 20, such as at the Tormentor, and what you need to take it alone. Go there on time with the requirements met.

**Signal — observable.** Tormentor kills and times come from `objectives`.

### F10 · 25:24–26:56 · any stage · late farm is the root cause

**Claim.** The coach traced the loss to one cause: the late first item. It delayed the next item by four minutes; without it the player died twice; those deaths cost more net worth and a level; later fights were lost by a level and an item. With the first item at 11 minutes, he believes the game ends 20:0.

**Signal — observable.** Item times from `items.purchases`, net worth by minute from `series`, team net worth from `teamEconomy`, and deaths from `deathAnalysis.contexts`. The causal chain is a review judgement.

### F11 · 27:58–29:03 · farm · autopilot farming frees attention

**Claim.** While the player thought about farm, he barely moved his camera to fights. Farming has to become automatic, so attention stays on the game.

**Signal — not observable.** Camera and attention are not recorded.

### F12 · 23:52–24:53 · mentality · losses show what to change

**Claim.** You improve when you lose, because a loss shows what to change; a win makes you think you are good. After a streak of losses, rest, then assess the problem honestly or ask someone else to. There is no point in forcing games you don't enjoy.

**Signal — not observable.** No mental-state data.

## Coaching method

- In his own live sessions he mostly stays silent and writes down mistakes for after the game. Instant advice may not land in a second and can ruin a moment.
- If a replay shows too many mistakes in the first 15 minutes, he stops watching it and works on those.
- He closed with three points, ordered by impact, and one exercise.

## Exercises the coach gave

- Farming challenge against bots that harass you, without killing them: 350 last hits by 20 minutes and 500 by 25, without skipping an ancient camp. The coach calls it very hard; the point is finding farm with your eyes on autopilot.
- Set a last-hit target for 25 minutes before the game and track it.

## Not taken

- Hero, facet, talent and item choices.
- Neutral item advice and the Tormentor requirements (7.39d).
- The coach's own playtime and patch-adaptation routine.

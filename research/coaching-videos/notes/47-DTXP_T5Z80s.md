# 47 · A 15K coach plays carry at low MMR and explains how to climb

- **Video:** [КАК ВЫБРАТЬСЯ С ЛОУ ММР НА КЕРРИ](https://youtu.be/DTXP_T5Z80s) · Ueio · 2026-05-09 · 107 min · Russian
- **Patch at publication:** 7.41c. Hero builds, talents and neutral items are left out.
- **Type:** live-format guide. The coach, with a 15K peak, plays three carry games at low MMR on an account that can't use chat or voice, commenting on every decision.
- **Subject:** position 1 at low MMR
- **Source:** auto-generated captions only. The first game is read in detail and the other two sampled.

## Core idea

To climb, "out-play your position": play better than the enemy carry from start to finish, mostly by farming faster and dying less. The coach believes nearly every low-MMR player farms badly. He doesn't claim you must win every game: a 55% win rate is enough to climb fast.

In the first game the coach left a hard lane about even: 4,700 net worth against the enemy offlaner's 4,400. The difference came after the lane: 12K of farm against the enemy carry's 8K.

## Findings

### F1 · 2:08–3:10 · pre-game · don't give first blood, then read your lane

**Claim.** At the start, stand out of vision near the bounty rune. At low MMR teams rarely group five or smoke, so simply not giving first blood already helps. Then assess the lane:
- is it good or bad;
- how to stand it;
- do you need your support;
- should you block the big camp?

Against a lane that counters you, a defensive or sustain item you wouldn't normally buy can be right, so the offlaner doesn't get free farm.

**Signal — partly observable.** First blood and early deaths come from `objectives` and `deathAnalysis.contexts`, and the lane from `lane.opponents`. Starting purchases are in `items.purchases`.

### F2 · 3:40–4:11, 6:17–6:49 · lane · keep re-aggroing the creeps

**Claim.** Low-MMR players manage creep aggro badly. Keep drawing the creeps so the enemy struggles to deny and you can last hit comfortably.

**Signal — partly observable.** Last hits and denies by minute from `series`. Aggro is not recorded.

### F3 · 12:39–13:10 · any stage · buy your own wards

**Claim.** Wards are cheap. Nobody owes you them. The coach goes further: a carry who never buys wards is ruining the game for his team.

**Signal — observable.** The player's placements in `wards`.

### F4 · 14:12–15:14, 19:29–20:31 · farm · the jungle is a bonus, not the base

**Claim.** Farming the jungle is always the less profitable choice. It is bonus farm for short periods, never the main source; even in a hard lane, players usually endure the lane. At low MMR, nobody smokes to kill you, but don't go too deep into the enemy's jungle; stand your lane as long as you can.

**Signal — derivable.** Lane versus neutral last hits, from the collected `events.cs`.

### F5 · 17:55–19:29, 25:14–26:19 · farm · out-play the enemy carry by farming

**Claim.** "Better" doesn't mean winning the lane; it means playing better than the enemy carry from start to end. Mostly that is farming: lane, kills and everything else turn into net worth, and with net worth you can always win. To climb from low MMR:
- don't feed;
- watch the minimap;
- know where to farm;
- farm fast.

A carry who dies no more than the enemy's and out-farms him should win about 70% of his games.

**Signal — observable.** Net worth and last hits by minute from `series`, and deaths from `deathAnalysis.contexts`. The enemy carry's farm is in the sources but not published; `teamEconomy` shows the team difference.

### F6 · 22:04–23:08, 24:44–25:14 · midgame · don't rush, and keep the teleport

**Claim.** A game usually lasts around 40 minutes. Don't hurry: farm and take only the fights that favour you. Don't spend the teleport without a serious need, or you will miss fights.

**Signal — partly observable.** Teleport purchases are in `items.purchases`. Uses are collected but not published. Fights around deaths come from `deathAnalysis.contexts`.

### F7 · 29:32–31:08 · late game · the Aegis is not a reason to siege

**Claim.** In an even game, or even about 10K ahead, the Aegis alone is not a reason to go up the high ground. Go up only after an enemy dies outside the base. Any fight outside their base is a good one.

**Signal — observable.** Aegis, buildings and times from `objectives`, and the lead from `teamEconomy`.

### F8 · 1:06:30 · midgame · two deaths decide a carry duel

**Claim.** In another game the enemy carry left his lane with net worth equal to the coach's. He then died twice for nothing, and from then on his game was practically unwinnable.

**Signal — observable.** Deaths by phase from `phases` and `deathAnalysis.contexts`, and the net worth trend from `series` and `teamEconomy`.

### F9 · 1:44:27 · mentality · a 55% win rate is enough

**Claim.** You don't need to play like a coach and win every game. Doing the basics well enough for about 55% wins climbs quickly.

**Signal — partly observable.** Win rate over time comes from `progress` when history is requested.

## Coaching method

- Live commentary of every decision, with no chat or voice contact with teammates.
- After each game, a stat comparison with the direct opponents: net worth leaving the lane, farm, damage.

## Exercises the coach gave

- The farming challenge against bots (see note 23): many last hits without killing the bots.
- Bind illusions and important units to control groups.

## Not taken

- Hero builds, talents and neutral items (7.41c).
- Remarks on teammates, reports and the paid-content promotion.

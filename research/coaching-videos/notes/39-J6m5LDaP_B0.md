# 39 · BalloonDota: the carry's lane priorities

- **Video:** [Your Laning Phase Is Keeping You Stuck in Low MMR - Dota 2 Carry Guide](https://youtu.be/J6m5LDaP_B0) · BalloonDota · 2026-08-05 · 10 min · English
- **Patch at publication:** 7.41e. Hero examples are left out.
- **Type:** excerpt from a group coaching call, with students' questions
- **Subject:** position 1 in lane
- **Source:** auto-generated captions only; includes a course promotion

## Core idea

The carry's lane actions have a fixed priority:
1. Trade, whenever a 2v1 is on or an enemy is out of position.
2. Last hit.
3. Deny.
4. When zoned out, just take XP.

A hard lane is temporary and can't be forced. The carry follows the support: when the support trades, trade; when it is passive, stay passive.

## Findings

### F1 · 0:00–2:04 · lane · trades come before last hits

**Claim.** Don't keep hitting creeps or run to pull while a 2v1 trade is on; take it. A kill on one enemy lets you kill the other. If a last hit is dangerous, draw the creeps back first. When the enemies zone you, stand in XP range and don't try to draw aggro; most players lose their patience here.

**Signal — partly observable.** Last hits, denies and XP by minute come from `series`, and hero damage in the lane phase from `phases`. Trades and creep aggro are not recorded.

### F2 · 3:07–4:39 · lane · when to leave creeps to join your support

**Claim.** Join your support's trade if you can reach it within a few seconds and it will bring a kill or heavy damage. Ask yourself three things:
- Can I reach it in time?
- How many creeps do I give up?
- Is the gain big: will the enemy die or be forced back?

The earlier in the lane, levels 1 to 3, the more it pays.

**Signal — partly observable.** Kills in the lane phase from `phases`, and last hits by minute from `series`. Positions during trades are derivable from the position rows.

### F3 · 1:02–1:33, 4:39–5:41 · lane · don't blame the support; buy regen

**Claim.** Most carries walk into aggro, lose their health and blame their support. You don't control your support; follow what it does. Ask for what you need in a friendly way: a tango, a deward, help. Buy regen rather than saving gold. If you buy lots of regen and your net worth is still low, the cause is bad trades or bad positioning: regen is a by-product.

**Signal — observable.** Regen purchases and their times come from `items.purchases`, and net worth by minute from `series`.

### F4 · 5:41–7:45 · lane · push out, then pull

**Claim.** Keep the wave near your tower. When it drifts toward the enemy and staying becomes dangerous, usually around levels 4–6, kill the wave and pull the camps so the next wave comes back to you. From about level 5–6, push, pull and start farming the jungle.

**Signal — partly observable.** Neutral last hits in the lane phase are derivable from the collected `events.cs`. Pulls and wave position are not recorded.

### F5 · 7:45–9:20 · lane · buy your own sentry

**Claim.** If your pull camp is blocked, buy a sentry yourself from two or three minutes; it costs little and gives you the pull. Don't depend on the support for it.

**Signal — observable.** The player's sentries in `wards`.

### F6 · 9:20–9:51 · lane · feel the gank coming

**Claim.** Around minutes 8–9, with the enemy support missing, the enemy offlaner at level 6 and the mid missing, showing yourself on the wave means dying. You have to feel it without seeing it.

**Signal — partly observable.** Deaths around that time, with the enemies nearby, come from `deathAnalysis.contexts`. Enemy visibility is not recorded.

## Exercises the coach gave

- In lane, follow the order: trade, last hit, deny, take XP.
- Before leaving creeps for a trade, ask: can I reach it, how many creeps do I lose, and is the gain big?

## Not taken

- Hero examples and the course promotion.

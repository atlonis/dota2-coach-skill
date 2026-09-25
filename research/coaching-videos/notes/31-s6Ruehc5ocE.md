# 31 · Two top players discuss carry farming over one game

- **Video:** [КАК ПРАВИЛЬНО ФАРМИТЬ | ГАЙД ОТ 15К ТРЕНЕРА](https://youtu.be/s6Ruehc5ocE) · NVGATO · 2026-07-15 · 38 min · Russian
- **Patch at publication:** 7.41d. Hero, talent, neutral item and build debates are left out.
- **Type:** guide in the form of a played game with commentary. A top-ranked carry player (about 13K peak) plays position 1 Anti-Mage in a Titan-rank lobby. A 15K coach comments alongside and often disagrees.
- **Source:** auto-generated captions only; includes a sponsored segment

## Core idea

A carry wins by out-farming: finishing items before the enemy does without dying. At low ranks that is nearly everything: "hit creeps and don't die". Higher up the same rule holds, with more attention to:
- who can kill you, and where;
- pushing lanes rather than hiding in the jungle;
- keeping regen so the lane never forces a walk back;
- reading the minimap constantly.

## Findings

### F1 · 6:18–6:49, 20:49 · lane · keep the escape for escaping

**Claim.** Don't spend your escape spell to initiate a trade. Keep it for a sure kill or to get out. The carry should play second: react when enemies commit on your support. Never force solo kills.

**Signal — not observable.** Ability targets and intent are not recorded. Lane deaths come from `deathAnalysis.contexts`.

### F2 · 7:22–9:56 · lane · bring extra regen

**Claim.** Buy an extra healing salve with your first gold. Trade your health for the enemy's mana, then heal; the enemy usually has no regen left. Both players cite a chart: the lower the rank, the fewer consumables players buy, and low-ranked players almost never buy mana regen. 100 gold of regen returns about 200 gold plus XP by keeping you in lane.

**Signal — observable.** Regen purchases and their times come from `items.purchases`, including the pre-game window. No peer norm for regen purchases exists in the artifact.

### F3 · 10:58–12:32 · lane · a sentry for the twin gate, and know the enemy's actives

**Claim.** At about five minutes, a carry can place a sentry or observer at the twin gate to see ganks coming. Track the enemy's active items, such as an invisibility or disable item on the mid, so a gank never surprises you. If you win your lane by five minutes and can hold it alone, send your support through the gate to pressure the enemy carry in the other lane.

**Signal — partly observable.** The player's own wards come from `wards`. Enemy items are only in the sources.

### F4 · 13:05–13:37 · lane · last hitting is the floor

**Claim.** Clean last hitting is what climbing is impossible without. A player at 4K or below would have missed many more creeps in the same lane.

**Signal — observable.** `series.lh` and `baseline.comparisons`.

### F5 · 13:37–14:09, 16:12–16:43 · lane · farm nearby camps between waves

**Claim.** Don't stand waiting for the next wave. Take the nearby camps in between. The farming pattern is not a template: move to whichever farm is nearest.

**Signal — derivable.** Neutral last hits in the lane phase, from the `isNeutral` flag in `events.cs`, collected but not published.

### F6 · 14:09 · lane · the enemy mid's waves tell you he is coming

**Claim.** When the enemy mid lets two waves push into his tower and his hero doesn't farm the jungle, he is probably coming to gank you.

**Signal — not observable.** Waves are not recorded. The enemy mid's position row could show the move.

### F7 · 17:44–19:16 · midgame · push lanes; the jungle is absence

**Claim.**
- Know which enemy duo or trio can kill you.
- When you see enemies elsewhere, push your lane at once: a pushed lane is pressure.
- Farming the jungle means you are absent from the map: no risk, but no impact. It is worth it only when it dodges a gank.
- Don't farm a jungle with no lane next to it; stand where the next wave will arrive.

**Signal — derivable.** Lane versus neutral last hits by phase, from the collected `events.cs`.

### F8 · 23:28–25:04 · midgame · the game needs objectives; spikes come from item speed

**Claim.** The game won't end until your team takes objectives. The two players disagreed on Roshan:
- The carry player takes Roshan whenever the timing is right; he feels comfortable only with the Aegis.
- The coach argued that a slow-hitting hero spends about 1,000 gold of farm time on Roshan, and a smoke to hunt would pay more.

The coach's view of the power spike: not six slots, but buying the fourth and fifth items quickly. The longer the game, the closer to 50/50, because the enemy gets slots too.

**Signal — observable.** Roshan and Aegis events from `objectives`, and purchase times from `items.purchases`.

### F9 · 28:21–29:25 · midgame · at low ranks, just farm; farm the enemy's jungle

**Claim.** The lower the rank, the less there is to invent: hit creeps and don't die. Farming the enemy's jungle both scouts for your team and takes the enemy's farm.

**Signal — partly observable.** Last hits and deaths by phase in `phases`. Where the farm happened is derivable from the collected `events.cs`.

### F10 · 29:56–31:28 · any stage · watch the minimap, remember where enemies were

**Claim.** Players, even at Titan, look at the minimap far less often than they should. When the map goes dark, they panic and run. Scroll back 10–20 seconds and you can see where every enemy was. Put your focus on the map, not on flashy mouse movement.

**Signal — not observable.** Camera and attention are not recorded.

### F11 · 32:30–34:04 · midgame · out-farm, and adapt to the lobby

**Claim.** Winning by out-farming is a skill. With many mistakes, six items come at 45 minutes instead of 33, and the enemy gets theirs too. Five deaths and a lost lane would make the game hard even for a smurf. Adapt to the rank: at low ranks, teleporting into a five-on-five at mid just loses your farm.

**Signal — observable.** Item times from `items.purchases`, deaths from `deathAnalysis.contexts`, and net worth from `series` and `teamEconomy`.

### F12 · 33:34–34:35 · lane · check the mid around level 6

**Claim.** Around level 6, look at the mid. If the enemy mid can be punished, go and help. High-MMR carries teleport to fights when they know it will be five against five.

**Signal — derivable.** The player's teleports into fights, collected in `events.repositions`, and OpenDota's teamfights. Not computed yet.

## Exercises the players gave

- Experiment with unusual items on your own heroes in unimportant games, to learn from your own experience why items are bought.

## Not taken

- Hero-specific lane matchups, talents, neutral items and the long item debate (7.41d).
- The sponsored segment and the talk about watching professional games.

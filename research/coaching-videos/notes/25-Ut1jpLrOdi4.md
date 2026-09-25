# 25 · An 11K offlane coach reviews a 5K streamer's offlane game

- **Video:** [ГОЛОВАЧ РАЗБОР ИГРЫ ОТ 11К ММР ТРЕНЕРА! ОН НИКОГДА НЕ ОШИБАЕТСЯ!?](https://youtu.be/Ut1jpLrOdi4) · Shergarat (Vladimir) · 2024-07-01 · 78 min · Russian
- **Patch at publication:** 7.36c. Hero, facet, talent and item choices are left out.
- **Type:** replay review of a streamer's game, with advice aimed at viewers
- **Subject:** position 3 Legion Commander at about 5K in a hard lane against a carry and a support. The streamer switched to the offlane recently.
- **Source:** auto-generated captions only; clips of the streamer flaming teammates open and close the video

## Main finding

The coach rates the level as normal for 5K. The player knows the theory:
- he bought the right lane items;
- he traded resources deliberately;
- he tried to use his items.

He lost the game in two stretches.

- **The lane:** he missed resource trades early, lost health for single creeps, and his last hitting failed.
- **After the lane:** he stopped farming. He teleported to fights before they started and ran around healing allies, sometimes two minutes without a last hit. He then initiated without checking where his team and the enemy's save support were.

The coach's advice: the offlaner is a full core; balance the aggression with farm and keep net worth.

## Findings

### F1 · 3:38–4:41 · pre-game · decide before the horn whether to out-trade or survive

**Claim.** Starting items follow the lane plan. Against a lane you want to fight, buy more stats and skip extras. Against a lane you can't win, plan to rush boots and run.

**Signal — observable.** Starting purchases in `items.purchases`, from the pre-game window, and the matchup in `lane.opponents`. The plan's fit is a review judgement.

### F2 · 5:22–7:29 · pre-game · a rune plan, or leave

**Claim.**
- If your team gathers bottom, contest that rune five against five, or smoke around.
- Otherwise the offlaner waits in the bushes near the top rune and takes it if it is free; if enemies show, he goes to lane.

Here the team stood in the wrong place with no information. A support went for a rune alone and died, and nobody blocked the first wave. Against this lane the block mattered: the closer the wave to your tower, the harder the enemy's combo.

**Signal — partly observable.** Deaths before the horn and in the first minute come from `deathAnalysis.contexts`. Rune pickups are collected but not published. Creep blocks are not observable.

### F3 · 8:32–12:05 · lane · laning is a battle of resources

**Claim.** Trade when the enemy support has spent his heal and your area spell can hit two heroes. With full mana and a spent enemy heal, the player skipped a winning trade. To judge the reach of such a spell, show its range on screen.

**Signal — not observable.** Health, mana and cooldowns are not recorded. Hero damage in the lane phase comes from `phases`.

### F4 · 19:53–21:31 · lane · one creep is not worth the wave's damage

**Claim.** Walking into the enemy wave for one last hit cost 150–250 health for about 15 gold, and the creep was missed anyway. Either pull the wave to your side, or stand back and react.

**Signal — not observable.** Health is not recorded.

### F5 · 21:31–22:33 · lane · alone against two, stay in experience range

**Claim.** When your support leaves and you face two heroes, stand under your tower within experience range. Don't take fights you would lose on numbers. Show the experience range on screen to play at its edge.

**Signal — partly observable.** XP by minute from `series`. The support's departure is derivable from his position row.

### F6 · 25:41–27:16 · lane · last hitting is the secret of net worth

**Claim.** Many players below about 5K last hit poorly. Even with a free lane they have little net worth at 10 minutes. Train last hitting in a custom lobby.

**Signal — observable.** `series.lh` and `baseline.comparisons` at 10 minutes.

### F7 · 28:19–28:52 · lane · avoid tower aggro while approaching

**Claim.** Under the enemy tower, right-click near the enemy, not on him, until you are in range. Clicking him from afar draws tower aggro before you hit.

**Signal — not observable.** Orders and aggro are not recorded.

### F8 · 28:52–29:23 · lane · a rotating enemy mid means leave

**Claim.** Once the immobile enemy mid comes to your deep push, you have already won: he spent time. Now just survive.

**Signal — derivable.** The enemy mid's position row against the player's position and any death soon after. Not computed yet.

### F9 · 33:36–34:38 · teamfight · teleport out once the stuns are spent

**Claim.** Count the enemy's stuns. When they are used, a teleport out makes you unkillable, if you react within the window. Dying without a teleport means a long walk back and lost waves.

**Signal — partly observable.** Deaths come from `deathAnalysis.contexts`, with the last teleport before each one in `recentReposition`. Teleport purchases are in `items.purchases`. Enemy cooldowns are not observable.

### F10 · 36:43–38:17, 39:48–42:23 · midgame · the offlaner is a core: farm

**Claim.**
- Net worth matters for the offlaner as for the carry.
- Don't teleport from farm to a fight that hasn't started. That costs the farm, the walk back and the teleport the real fight will need.
- When your team is clearly losing, give a tower and farm two sides. Don't run around healing allies.

The player went two minutes without a last hit and fell far behind in net worth.

**Signal — partly observable.** Minutes without last hits show in `series.lh`, and net worth in `series` and `teamEconomy`. Teleports are collected but not published.

### F11 · 41:52–42:23 · midgame · a new key spell is not a reason to roam

**Claim.** With the key ultimate just learned, don't run the map for kills. Hold your lane and use it when enemies come. Play more actively after the initiation item.

**Signal — partly observable.** Skill timing comes from `skillBuild`, and last hits from `series`. Roaming is derivable from the position row.

### F12 · 47:33–48:35, 52:41–53:43, 1:08:35–1:09:05 · teamfight · focus around the enemy's save

**Claim.**
- Jump only when the enemy's save support is elsewhere, or jump on that support.
- Judge the player, not only the hero: a weak support may never use his save, a strong one will.

**Signal — not observable.** Targets and enemy cooldowns are not recorded.

### F13 · 48:35–49:36 · midgame · an initiation item needs a smoke

**Claim.** After buying the initiation item, buy a smoke to use it. With no smokes, farm near waves and wait for the enemies to come.

**Signal — partly observable.** The player's smoke purchases are in `items.purchases`. Smoke use is collected in `events.itemUses` but not published.

### F14 · 1:03:17–1:04:20 · items · buy the item that solves your main problem

**Claim.** Name the one problem in this game, then buy the item that removes it:
- a lot of enemy control: immunity;
- no way into position: invisibility or a blink.

If there is only one problem, one item solves the game for you.

**Signal — observable.** `items.purchases`, `mechanics.items` and `draft`. The fit is a review judgement.

### F15 · 1:00:38–1:01:42, 1:06:29–1:08:04 · teamfight · check the minimap before initiating

**Claim.** Before jumping, check where your team is. One against five loses even with more farm. With the enemy carry holding the Aegis and two supports down, the jump was not worth it: push the lane, farm and wait.

**Signal — partly observable.** Allies near the player at each death come from `deathAnalysis.contexts`, and the Aegis from `objectives`.

## Coaching method

- He separated the player's mistakes from bad team decisions, and said so when a fight was not the player's fault.
- He acknowledged good trades and good item buys.
- He gave viewers practical settings: show the ranges of the key spell and of experience.
- He closed with a balanced summary: strengths, then the two areas to fix.

## Exercises the coach gave

- Last-hit training in a custom lobby.
- Show the ranges of your key spell and of experience, and play by them.
- In a fight, count the enemy's stuns before deciding to teleport out.

## Not taken

- Hero, facet, talent and item choices (7.36c).
- The streamer's flaming clips and the advertisement.

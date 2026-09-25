# 16 · SERGGEICH reviews a 4,000 MMR support (Treant Protector)

- **Video:** [ЭТО ТОЧНО ЕГО ММР?! 10к ТРЕНЕР РАЗБИРАЕТ игру подписчика на 4000 ММР](https://youtu.be/hZe6LlQtuqk) · SERGGEICH · 2026-06-08 · 35 min · Russian
- **Patch at publication:** 7.41d. Hero mechanics and item choices are hero and patch specific and left out.
- **Type:** recorded replay review without the player present
- **Subject:** position 5 Treant Protector at about 4,000 MMR, in a game with a big lead that was lost
- **Source:** auto-generated captions only

## Main finding

The coach judged the support's macro as mostly fine for his rating. He blamed the lost game on items and on missing save-support play. The support bought an initiation item into a team that already had four initiators, instead of saves against the enemy's damage and disables. He also used his protective spell and ultimate on himself or too early, and was often on the other side of the map when his carry was caught. The carry died ten times.

## Findings

### F1 · 0:31–2:05 · lane · a support's early timings

**Claim.** A support should keep a list of early timings:

- warn the team about the lotus spawn;
- pull at the right second so the full wave goes into the small camp;
- use the resulting quiet time to ward and to help the mid at the rune;
- at nightfall, go through the twin gate for a gank.

For a pull, be at the creeps by the 15th and 45th second of the minute.

**Signal — partly observable.** Ward times come from `wards`, and rune pickups from `events.runes`. Pulls are not observable.

### F2 · 4:10–5:44 · lane · keep the small camp open against a lane-pusher

**Claim.** Against an offlaner who pushes the lane, keep the small camp free by checking and removing enemy blocks. Ward the big camp so it stays blocked. Place sentries where the blocker has to walk far to find them.

**Signal — partly observable.** Sentry placements come from `wards`. Camp blocking and pulls are not recorded.

### F3 · 5:14–6:16, 21:31–23:07 · early game · contest the lotus with your partner, and use lulls

**Claim.** When the lane is stable, bring your lane partner to take the lotus together. In any quiet second, ask what useful thing you can do now: stack a camp on the way, take the rune, check the usual ward spot with your body while the team pushes a tower.

**Signal — not observable.** Lotus pickups and stacks are not in the artifact.

### F4 · 11:32–16:50 · midgame · ward from cover, and where it sees more

**Claim.** Place observers from behind trees so the enemy doesn't see you plant them. Choose spots that cover a lane path, the river and nearby camps at once. Place them ahead of an objective's timing: an observer placed near 14 minutes, when observers last six minutes, covers the Tormentor at 20.

**Signal — partly observable.** Placement times come from `wards`. Coordinates are deliberately left out until the map grids are reconciled.

### F5 · 16:18–18:55, 23:38–24:41 · teamfight · save spells go on the focused ally

**Claim.** A defensive spell belongs on the ally who is being focused or taking heavy damage, at that moment. Using it on yourself, or not at all, cost the carry his life more than once. Watch for an ally's key item on cooldown, such as immunity, and tell the team. Time a channel-breaking ultimate to interrupt the enemy's cast, not before it.

**Signal — partly observable.** The carry's deaths are observable per participant. The player's ability uses come from `events.abilityUses`, but their targets are not recorded.

### F6 · 18:55–20:58 · midgame · buy what the team is missing

**Claim.** Look at what your team already has before buying. A fifth initiation item for a team with four initiators adds nothing. The team needed saves and dispels against the enemy's mixed damage, slows and disables, plus a stat aura for the right-clicking carry. Buy the key save item as early as possible, because it is worth most before the enemy has damage.

**Signal — observable.** `items.purchases` and `mechanics.items`. Team composition comes from `draft`. The fit is a review judgement.

### F7 · 25:13–25:43, 28:19–29:00 · midgame · stay where the carry can be caught

**Claim.** When the team splits across the map, a save support should be near the ally who will be jumped, not on the other side. Scouting alone is fine only when nothing threatens the carry.

**Signal — derivable.** Distance from the player to the carry at each of the carry's deaths, from the position rows.

### F8 · 26:14–27:16 · teamfight · don't focus the tankiest hero

**Claim.** Pouring every spell into the enemy's tankiest hero, with his defensive ability up, wastes the fight. Pick targets you can kill.

**Signal — not observable.** Damage targets are not recorded.

## Coaching method

- Narrated review with frequent "notice this" micro-tips on mechanics: pull timings, ward placement from trees, a channelled spell used to interrupt.
- He separates macro, which he judged mostly fine, from build and micro, which he judged easy to fix.

## Exercises the coach gave

- Learn the 15th and 45th-second pull timings and the pre-lotus warning.
- Before each purchase, list what your team already has and what it lacks against the enemy's damage.

## Not taken

- Hero-specific spell mechanics and neutral item choices.
- The item recommendations for this patch (7.41d).
- The channel promotion.

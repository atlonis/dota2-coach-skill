# 14 · Common Sense Dota reviews a 1K carry, a 3K offlaner and a 7K carry

- **Video:** [ЕСТЬ ЛИ РАЗНИЦА МЕЖДУ 1К И 7К ММР? | РАЗБОР ОТ ТОП-30 ТРЕНЕРА](https://youtu.be/MktSL2o9YTQ) · Common Sense Dota · 2026-06-24 · 106 min · Russian
- **Patch at publication:** 7.41d. Item and talent choices are excluded.
- **Type:** three recorded replay reviews without the players present, each ending with a summary
- **Subject:**
  - a 1,000 MMR illusion carry, Naga Siren, in a hard lane;
  - a 3,000 MMR offlaner, Enigma, whose team lost a lead after 20 minutes;
  - a 7,000 MMR illusion carry, Terrorblade, who lost a long game "1v9".
- **Coach:** 14K MMR, described as a top-30 coach
- **Source:** auto-generated captions only

## Main finding

The coach's answer to the title question is that the difference between 1K and 7K is small. All three players made the same kinds of mistake:

1. **Bad farming patterns.** Running across the map, farming camps far from the next wave, and leaving waves to die.
2. **No conversion.** Buying items without turning them into kills, towers or Roshan. At 7K, the key cooldown was repeatedly spent on creeps instead of on a kill or a tower.
3. **Fights for nothing.** Fighting without the key spell or item, away from an objective, or into an enemy who holds the better position.

Each player's summary also named a build that ignored the enemy's damage type.

## Findings

### F1 · 3:37–11:24 · lane · spend gold at once, and use summons for a purpose

**Claim.**
- Don't carry 600–800 gold; buy as soon as you can afford something.
- Summons and illusions in lane should do a job: harass, zone, block the big camp, or pull creeps away.
- Sent on a pointless run, a summon only feeds the enemy.
- Against a lane that uses spells constantly, a charge item on the first gold pays off.

**Signal — partly observable.** Purchase times come from `items.purchases`. Unspent gold is not in the artifact, although OpenDota has gold per minute. Summon use is not recorded.

### F2 · 6:10–11:24, 16:00–20:00 · early game · farm camps next to the lane

**Claim.** A fast-farming carry should farm the camps closest to where the next wave will arrive. Then each camp flows straight into the next wave. With illusions or summons, drag the wave into the jungle beside a camp and farm both together. A wave left to die at your tower should never happen. The less you run, the more you farm.

**Signal — derivable.** From the position row, the path between successive last hits in `events.cs`, and waves the player never touched. Not computed yet.

### F3 · 11:24–12:00, 24:00–25:00 · midgame · never walk under an enemy tower you can't see around

**Claim.** Don't go under an enemy tower unless you intend to take it and the enemies are showing elsewhere. If most of them are unseen, any of them can be near, or can teleport onto the tower's area. When enemies show in one place, they cannot be in another, so farm that side confidently. Click enemies to check items such as blink.

**Signal — derivable.** Deaths near enemy towers from `deathAnalysis.contexts`, with enemy positions from the position rows.

### F4 · 16:30–17:40, 42:00–42:30 · midgame · teleport to keep farming, and always carry one

**Claim.**
- When caught and there is time to think, teleport to a tier-2 or tier-1 tower near farm, not to the base.
- Don't spend a teleport to save two creeps' worth of walking, because it costs 80 seconds of not being able to join fights.
- Rebuy a teleport immediately; a fast farmer can carry two or three.
- Don't run across the map on foot; use the teleport.

**Signal — derivable.** Teleports in `events.repositions` with their destinations, and long walks from the position row. Teleport stock is not observable.

### F5 · 19:40–20:40, 1:00:05–1:02:40 · midgame · split up after a fight

**Claim.** After a fight or a Tormentor kill, the team should split to farm. Four players sharing one camp is wasted time. A strong carry who ends up in the same area as teammates should farm the opposite side.

**Signal — derivable.** Allies within a short distance of the player while he farms, from positions and `events.cs`.

### F6 · 22:00–27:30, 1:29:13–1:31:00 · midgame · convert items and cooldowns into objectives

**Claim.**
- An item bought for kills must be used for kills: ward the area where you want them and hunt there.
- Before about 20 minutes, a key temporary power cooldown belongs on a kill or a tower, not on faster creep clearing.
- A player with the top net worth who only farms his own safe jungle creates no pressure, however rich he is.
- Six slots full and still farming lets the enemy farm too.

**Signal — partly observable.** Item and objective times come from `items.purchases` and `objectives`. Hero damage by minute from `series` shows it: at 20, 30 and 40 minutes the 7K carry had the lowest damage in the game. Cooldown use is only partly visible, through `events.abilityUses`.

### F7 · 25:50–29:00, 1:10:00–1:12:00 · midgame · with the lead or the Aegis, play the enemy's side

**Claim.** The hero with the Aegis, or the top net worth, should take the enemy's camps and pin them in base. Farming your own side lets them out to farm. Don't try to kill Roshan alone when teammates won't help.

**Signal — derivable.** The player's position on the enemy half while holding the Aegis. Aegis pickups come from `objectives`.

### F8 · 29:00–31:00, 33:00–35:00 · midgame · don't join fights short of your power spike

**Claim.**
- When you are a little short of the key item and your side is outnumbered, don't connect to the fight; farm the item first.
- A fight needs a reason: a tower, Roshan, Tormentor, defending your zone.
- It also needs your own vision. With neither, just farm.

**Signal — partly observable.** Purchase times against `events.teamfights`, and fight locations against `wards` placements.

### F9 · 34:06–35:40, 1:13:35–1:15:40 · midgame · prepare the ground before an objective

**Claim.** Before Roshan or Tormentor, push the nearby waves so the enemy must show on them, ward the area, and take the zone. Only then take the objective. Never start Roshan before killing enemies who are all alive. That gives them the perfect position to catch you inside the pit.

**Signal — partly observable.** Roshan kills and times come from `objectives`, and wards placed near the pit from `wards`. Wave state is derivable.

### F10 · 1:08:57–1:09:30, 1:38:34–1:39:05 · any stage · the enemy is where his vision is

**Claim.** An enemy who shows in an area has vision there. If your sentries find nothing on one side, the enemy plays the other side. Don't climb high ground in the open when you don't know where the enemy is.

**Signal — partly observable.** Your side's wards are recorded, but enemy wards are not in the artifact.

### F11 · 1:18:46–1:19:17, 1:43:47–1:44:17 · late game · attackers wait, defenders move

**Claim.** When you push high ground, the enemy is the one who must act. Hold position and wait for them to overstep, then answer. Running at a defender in good position as your immunity runs out gets you killed.

**Signal — derivable.** Deaths during high-ground pushes near enemy base structures, from `deathAnalysis.contexts` and `objectives`.

### F12 · 1:00:36–1:01:38 · teamfight · in teamfights, commit fully with the key spell up

**Claim.**
- When teammates group up, send summons to push a side lane and stay with the team yourself.
- Use immunity before the big ultimate, not after.
- A single-target ultimate on the enemy's key core is a good use, not a waste.
- Without the ultimate, stay out of the fight.

**Signal — partly observable.** Ability and item use times come from `events.abilityUses` and `events.itemUses`, but only for the player.

## Coaching method

- Each review begins from the player's own question: how to farm better, how to keep pressure, whether the game was winnable.
- Every review ends with a short list of conclusions.
- He compares the player's build and talents with a pro player's on the same hero, as a reference, not a rule.
- He uses the in-game damage graph at 20, 30 and 40 minutes as evidence that a build was not working.

## Exercises the coach gave

- Farm the camps closest to the next wave, and drag waves to your camps.
- Before using a key cooldown, name the kill or tower it is for.
- Keep a teleport in the slot at all times.

## Not taken

Named item, talent and build choices, and hero-specific advice for these three heroes (7.41d). The channel promotion is also left out.

# 15 · Common Sense Dota: a 4,800 MMR mid who won his lane and lost the game

- **Video:** [Выиграл мид? Красавчик, а слабо реализовать преимущество?](https://youtu.be/xh0-VtLvDG0) · Common Sense Dota · 2026-08-20 · 47 min · Russian
- **Patch at publication:** 7.41e. Item choices are left out.
- **Type:** paid coaching session with the player present, two replays
- **Subject:** position 2 at about 4,800 MMR. His question: after about 20 minutes the enemy pressed with big ultimates, and he did not know how to respond.
- **Source:** auto-generated captions only

## Main finding

The player won the lane but played passively afterwards. He farmed his own jungle instead of the enemy's after the tower fell. He let waves die while chasing hard ganks, used no wards, and never used the team's power spike, the offlaner's ultimate, from minute seven.

The coach's frame: once ahead, advantage compounds, a domino effect. Making a mistake gets harder, because you have more gold, more health and more of the map. Not converting the lead hands the enemy a comeback.

## Findings

### F1 · 6:14–8:48 · midgame · the enemy's big cooldowns set the timing

**Claim.** In this game the power spikes were the enemy's long cooldowns: three ultimates of roughly 130–160 seconds. In the window when they are down, play as aggressively as possible in the enemy's zone. When they are back, keep pressing, but carefully and with your save support nearby. Your own team's spike was the offlaner's ultimate from about minute seven; smoke to kill the enemy offlaner with it. Leave your own farming carry alone.

**Signal — not observable.** Enemy cooldowns are not recorded. Teamfights and kills around those times are derivable from OpenDota's teamfights and the collected kill events.

### F2 · 8:48–10:00, 14:30–15:36 · midgame · after the tower falls, take the enemy's zone

**Claim.** Once you can open the enemy tower, you must occupy the zone behind it. The enemy is then left farming scraps, and your net worth grows passively. Farming your own jungle while the enemy mid farms the area that should be yours is the turning point of the loss.

**Signal — derivable.** The player's neutral kills by map half, from `events.cs` positions, after enemy towers fall in `objectives`. Not computed yet.

### F3 · 10:54–13:00 · early game · a mid's pattern: the wave first

**Claim.** Before any gank, the mid kills his wave. Within every window, maximise net worth: either take the farm you set out for or don't go at all. With no ultimate, no rune and no resources, just farm. Better still, drag the wave to a camp and farm both.

**Signal — derivable.** Waves lost while the player is away, from the position row and `events.cs`.

### F4 · 15:36–17:41 · early midgame · gank only when the gank is easy

**Claim.** If a gank takes great effort, skip it and farm the nearest zone. A lane pushed toward the enemy's tower means your carry is fine; he needs no help. Spending every resource and walking across the map for a kill on a hero who doesn't matter throws the lead away.

**Signal — derivable.** Teleports in `events.repositions` to lanes, followed by a kill or none, and the player's last hits in the next minutes.

### F5 · 13:29–14:34 · midgame · a core can ward too

**Claim.** When several observers sit unbought in the shop, buy them yourself and ward the zone you plan to play. At higher MMR the enemy wards and watches the map. A kill won without vision was luck, and the next one will fail.

**Signal — observable.** `wards` records the player's placements, and the count is zero here.

### F6 · 25:31–26:35 · any stage · play from facts, not from fear

**Claim.** Decide from concrete facts:
- the ultimate or blink is up;
- the key teammate's ultimate is up;
- allies are under your ward and grouped;
- there is a smoke, the numbers, vision, high ground.

Fear that the enemy will outfarm you later is not a reason to fight now.

**Signal — partly observable.** Some facts are observable: `wards`, `objectives`, the numbers of allies near a death. Cooldowns are not.

### F7 · 2:36–5:43, 32:24–33:57 · lane · buy the charge item, and use auto-buy

**Claim.** Buy a charge item on almost every hero; skipping it cost health in every fight. Queue items with auto-buy so gold is never held. Don't walk to base with regen and a rune due. Don't stack before minute five as a mid: the lost wave costs more than the stack gives.

**Signal — partly observable.** Purchases and their times come from `items.purchases`. Unspent gold is not in the artifact.

### F8 · 39:43–40:44 · teamfight · a hero without a catch doesn't go first

**Claim.** A hero with no catch should not jump first onto full-health enemies. They simply leave. Wait for a teammate who can hold them.

**Signal — partly observable.** `firstAlliedDeathInFight` and the nearby allies at a death, from `deathAnalysis.contexts`.

### F9 · 40:47–44:21 · midgame · call smokes ahead of time

**Claim.** Ask for a smoke two minutes before you need it, so it arrives in time. Communication can be three pings: the key teammate, yourself, the target. Predict where an enemy carry goes next and set up the smoke there.

**Signal — not observable.** Smoke purchases and pings are not in the artifact.

## Coaching method

- He started from the player's own diagnosis ("we got pressed after 20 minutes") and moved the cause back to minute seven.
- He announced his standard in advance: "if I see you farming this zone when you could farm that one, it's a mistake".
- He praised good things, such as stacking and rune control, before the criticism.
- He closed by having the player state his own conclusions.

## Exercises the coach gave

- After taking an enemy tower, farm the zone behind it.
- Before every gank, check that the wave is cleared, and that the kill is easy.
- Ask for the smoke two minutes early, with pings if not by voice.

## Not taken

The comparison of two defensive items against this enemy lineup (7.41e), and the channel promotion.

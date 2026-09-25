# 26 · A coach reviews a mid player's game on stream

- **Video:** [Тренер Дота 2 | Разбор игры за Zeus](https://youtu.be/KW0e2hShp3w) · Дота 2 Тренер · 2024-04-11 · 68 min · Russian
- **Patch at publication:** 7.35d. Hero, item and build choices are left out.
- **Type:** replay review of a student's game on a live stream, with chat questions. The student answers in chat.
- **Subject:** position 2 Zeus in a low-MMR game; the rank is not stated
- **Source:** auto-generated captions only; the coach reads chat aloud

## Main finding

By minute 10 the coach had his diagnosis:
- weak last hitting;
- standing idle when there was nothing obvious to do;
- no coordination with supports, so kill windows on a weak enemy mid were missed;
- no wards on mid.

Later in the game two habits returned:
- walking without a teleport;
- the team diving the enemy's second towers after the first fell, which cost four heroes.

## Findings

### F1 · 0:00–3:43 · pre-game · the mid leaves base first and wards

**Claim.** When the game starts, the mid runs out at once to place his observer. It shows the enemy mid and the enemy's movement around the runes. Here the observer went down 11 seconds before the horn, and the player left base last. Place wards away from the standard spots, where you can deny them yourself. Use the pre-game to plan first blood or the runes with the team.

**Signal — observable.** Ward times come from `wards`, including placements before the horn.

### F2 · 3:43–4:45 · lane · block the wave onto the enemy ramp

**Claim.** A good block leaves the enemy creeps on the ramp while you stand on high ground: regen, tower cover and vision. Train blocking in a practice lobby that spawns waves on demand.

**Signal — not observable.** Creep blocks are not recorded.

### F3 · 5:46–7:20 · lane · train last hitting; last hit under the enemy tower

**Claim.** Train last hitting in the tutorial and the training map. Even under the enemy tower you can take creeps: the tower hits a ranged creep three times, then it is yours. It also tilts the opponent.

**Signal — partly observable.** Last hits by minute come from `series` and `baseline.comparisons`. Where each last hit happened is collected in `events.cs` but not published.

### F4 · 8:25–9:27, 17:26–17:57, 27:32–28:33 · lane · wards on both sides of mid

**Claim.** A mid can be ganked at any time, so keep observers on both sides and refresh them. A ward that gets dewarded gives the enemy some gold, but a gank you see coming saves your life. At low MMR, buy and place them yourself if the supports don't.

**Signal — observable.** The player's placements and times from `wards`, and side totals when all five logs exist.

### F5 · 12:06–12:38, 23:48–24:20 · lane · stay at your range and keep resources full

**Claim.** Don't walk close to an enemy with half health and full mana. Stand at your spell and attack range. The player's mana was constantly empty; keep health and mana high enough to survive a gank.

**Signal — not observable.** Health and mana are not recorded.

### F6 · 14:45–15:50, 24:53–25:57 · lane · never stand idle

**Claim.** When there is nothing obvious to do, look at the clock:
- stack a nearby camp and farm it later;
- block the next wave;
- deny.

The player walked back and forth and stood still. You must always be doing something.

**Signal — partly observable.** Last hits by minute from `series`. Stacks are in OpenDota but not extracted. Idle time is derivable from the position row.

### F7 · 15:50–16:22, 25:57–27:00 · lane · ask a named support for the kill

**Claim.** With a level advantage over a weak enemy mid who is low on health, ask a specific support to teleport to mid for a sure kill. Their teleport can also refill your bottle.

**Signal — not observable.** Comms are not recorded. Kills in the lane phase come from `phases`.

### F8 · 30:09–30:39, 35:30–36:01 · any stage · carry a teleport, avoid walking to base

**Claim.** A mid must always carry a teleport. Stock consumables so you rarely go back to base.

**Signal — partly observable.** Teleport purchases are in `items.purchases`. Trips to base are derivable from the position row.

### F9 · 32:14–33:48 · farm · jungle only when every lane is taken; bring components at once

**Claim.**
- Farm the jungle only when every lane is pushed toward the enemy or farmed by an ally; lane creeps come first.
- Don't wait to afford the whole item: send the regen component by courier now. It helps while you save for the rest.

**Signal — partly observable.** Purchase times come from `items.purchases`. Lane versus neutral last hits are collected in `events.cs` but not published.

### F10 · 36:01–37:04, 41:47–42:18, 44:31–49:17 · midgame · after the first towers, don't dive the second

**Claim.** A classic low-MMR error: once the first towers fall, the team runs at the second towers at once. Instead:
- farm, take Roshan;
- ward the enemy jungle;
- move together and farm there, catching enemies when they come out to their lanes.

Diving the second tower cost the team four heroes. At about 25 minutes, with the right items, it was fine.

**Signal — derivable.** Deaths near enemy second-tier towers, from `deathAnalysis.contexts` positions and `objectives`. Not computed yet.

### F11 · 42:50–43:26 · teamfight · calls must be concrete

**Claim.** "Go fight" is not coordination. "Smoke, arcane rune, go bottom on their carry" is.

**Signal — not observable.** No comms data.

### F12 · 50:19–53:31 · midgame · light the fog before pushing

**Claim.** When pushing a tower, spend your reveal spell on unseen areas. It shows wards and waiting enemies. The team got caught because nobody lit the bushes and there were no wards.

**Signal — not observable.** Vision is not recorded.

### F13 · 54:37–57:16 · midgame · convert a won fight into an objective

**Claim.** When enemies are dead, take Roshan, a tower or a side. The team instead kept fighting for its own sake and gave the advantage back.

**Signal — partly observable.** `objectives` shows what was taken after a fight. The fights themselves are in OpenDota's teamfights, not the artifact.

### F14 · 1:05:50–1:06:54 · late game · don't go in one by one

**Claim.** Late in the game, walk together. With two allies dead, don't take a four-against-five fight; back off. Feeding one at a time lets the enemy walk to your throne.

**Signal — partly observable.** At each of the player's deaths, `deathAnalysis.contexts` shows allies nearby and recent allied deaths.

### F15 · 38:37–41:16, 49:17–49:49 · items · explain every item

**Claim.** Items follow the enemy's abilities and their items. The coach asked the student to justify each item. "Damage, to kill people" is not a reason.

**Signal — observable.** `items.purchases`, `mechanics.items` and `draft`. The fit is a review judgement.

## Coaching method

- He prefers leading the student to the answer, and asks chat what is missing before saying it.
- He asks the student to justify each item choice in chat.
- He argued against replay-only reviews. A replay shows no comms: not what the player said, nor what allies told him. The coach's main job is building habits, and one replay review can't guarantee the student won't repeat the mistake. That limit applies to our own reviews.

## Exercises the coach gave

- Block practice in a lobby that spawns waves on demand.
- Last-hit practice in the tutorial, then on the training map.
- Bind camera hotkeys to the lanes and runes to check them in one key press.

## Not taken

- Hero, item and build choices, including the debate over the item route (7.35d).
- Chat banter, donations and comments on the other players.

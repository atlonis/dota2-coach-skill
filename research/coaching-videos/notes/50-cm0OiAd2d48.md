# 50 · An 11K support coach answers viewers' support questions

- **Video:** [ГАЙД НА САППОРТОВ от 10К ММР ТРЕНЕРА](https://youtu.be/cm0OiAd2d48) · Dimen · 2024-09-29 · 25 min · Russian
- **Patch at publication:** 7.37c. Ward coordinates and hero examples are left out.
- **Type:** interview guide. The channel host asks viewers' questions, and a support coach at about 11,400 answers with a map on screen.
- **Subject:** positions 4 and 5
- **Source:** auto-generated captions only; includes a sponsored segment

## Core idea

Every position contributes about a fifth of a win, and supports can climb: the coach says he climbed quickly as a support. The support's lane goal is to let its core reach his lane targets: levels, an item, resources, a balanced wave. Every action should be planned with a purpose, 30–40 seconds ahead of each timing. The question to keep asking is: "Is this effective for me and the team?"

## Findings

### F1 · 1:01–1:32 · draft · position 4 and position 5 differ in what they buy

**Claim.** The position 5 buys about 80% of the team's support items: wards, sentries, smokes. The position 4 buys about 20%. Position 4 heroes often roam or can grow into semi-cores; position 5 heroes need little gold.

**Signal — partly observable.** The player's position from `participants`, and ward counts from `wards` with side totals when all five logs exist. Smoke purchases appear in `items.purchases` for the player only.

### F2 · 4:06–8:51 · lane · pulls and camp blocks with a purpose

**Claim.**
- Block the big camp with a sentry to keep the enemy from pulling the wave under their tower, which gains your lane time.
- Don't block it when you can dominate but not kill, or when your core can farm it himself.
- Don't pull when the wave already sits where your core wants it.
- Half-pull one or two creeps to shift a pushed wave back.

A pull should have a goal: fixing the wave, killing a ranged creep to deny a level, or setting up a double wave for an attack or a lotus. Most players pull on autopilot.

**Signal — partly observable.** Sentry placements and times from `wards`. Pulls and camp blocks are not recorded.

### F3 · 8:51–12:30 · lane · plan every timing 30–40 seconds ahead

**Claim.** Think about each timing in advance:
- the lotus;
- the water and power runes against a mid with a bottle;
- the first siege wave and a gate move to kill and take a tower;
- the wisdom rune.

Contest a water rune only if taking it ruins the enemy mid's plan or leads to a kill; otherwise do something more useful, such as stacking. Leave the lane for good when your core can farm alone, or when the lane is lost either way: then pressure elsewhere and draw enemies away from your core.

**Signal — partly observable.** The support's position is derivable from the position row. Rune pickups are collected but not published.

### F4 · 12:30–13:32 · midgame · don't draw fights into your core's farming zone

**Claim.** Playing aggressively as a team in the area where your core farms quietly draws the enemies there. Create movement elsewhere.

**Signal — derivable.** Fight locations from OpenDota's teamfights against the core's farming area. Not computed yet.

### F5 · 13:32–14:36 · midgame · after the lane, play around the most active hero

**Claim.** After the lane, a support plays around the teammate who wants to fight. If nobody does, stay near the core farming the most dangerous area. When unsure whether to stack or join a smoke, weigh the kill chance against the risk. With a greedy core who can farm stacks, the stack may be worth more.

**Signal — derivable.** The player's distance to allies over time, from the position rows. Not computed yet.

### F6 · 14:36–19:18 · any stage · ward with a purpose

**Claim.**
- A high-ground observer sees the most but is the easiest to find; place it where your team can defend it or where the enemy isn't checking.
- An observer serves a fight, the area where your core farms, or the tower you want to push or defend.
- The first observers protect your core's jungle entrances.
- Put most wards where your team plays; in areas you don't play, use unusual spots that the enemy's usual sentry positions don't cover.
- Think like the enemy support: where would he place his sentries?

A good sentry covers a cliff and also a spot you can check yourself.

**Signal — partly observable.** Placement times and counts from `wards`. Coordinates are left out until the map grids are reconciled; enemy wards are not recorded.

### F7 · 19:18–21:53 · items · build for what your team lacks, and ask whether you can use it

**Claim.** Choose items from the draft and the enemies. Buy damage as a support only when your cores need no extra saves. Ask: can I actually deal this damage against these enemies? If the enemies have evasion or strong saves, a save or a longer-fight item is better.

**Signal — observable.** `items.purchases`, `draft` and `mechanics.items`. The fit is a review judgement.

### F8 · 21:53–23:26 · midgame · where a support's gold comes from

**Claim.** In an active game, gold comes from kills, towers, the Tormentor and Roshan. In a quiet one, from stacks, bounty runes, pushing out waves that come to you, and camps off your core's route. Ask teammates where they farm, so you don't take their camps.

**Signal — partly observable.** Gold and net worth by minute from `series`. Rune and camp income is collected but not published.

### F9 · 23:58–24:30 · teamfight · a good support is a living support

**Claim.** Supports are focused first in fights. Keep your position so you survive long enough to use all your spells.

**Signal — observable.** Deaths in fights with teamfight membership and `firstAlliedDeathInFight` from `deathAnalysis.contexts`.

## Coaching method

- Questions collected from viewers, answered on a tactical map.
- The coach returns to one question: is this action effective for me and the team?

## Exercises the coach gave

- Before every timing, plan your move 30–40 seconds ahead.
- Before placing a ward, put yourself in the enemy support's place: where would he sentry?

## Not taken

- Ward coordinates and hero examples (7.37c).
- The sponsored segment.

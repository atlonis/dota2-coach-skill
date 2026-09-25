# 33 · Samorodok: tempo as a timeline of objectives

- **Video:** [ТЕМП И ТАЙМИНГ — САМЫЙ ВАЖНЫЙ ГАЙД в жизни любого ИГРОКА](https://youtu.be/SLbn2nL2Jh8) · Samorodok · 2026-12-06 · 15 min · Russian
- **Patch at publication:** 7.39e. The minute marks depend on the map and rune timings of that patch; they are kept as the coach's example plan, not as current facts.
- **Type:** scripted macro guide
- **Source:** auto-generated captions only; includes a sponsored segment

## Core idea

Tempo is the minute from which each role is ready to do its job: the offlaner initiates, the mid makes space, the carry ends the game. A timing is the minute when one object is worth more than anything else on the map: a rune, a tower, the Tormentor, Roshan. Weak tempo means being far from the object that matters now. The coach's example is a carry farming the mid lane at minute 19, when the object that matters is the Tormentor at 20.

The coach contrasts two ways to play:
- **Leading:** take each object on time.
- **Playing second:** wait for the enemy's mistakes and punish them. It wins at low MMR, but doesn't make a player strong, because a player who leads well makes no mistakes to wait for.

## Findings

### F1 · 3:05–8:47 · any stage · the leading team's minute plan

**Claim.** The coach's timeline for the leading side:

| Minute | Object |
| --- | --- |
| before the horn | smoke the team into the enemy jungle for the bounty runes; the carry stays safe |
| 4 | a support helps the mid take the water rune |
| 6–7 | the mid takes the power rune, ganks the hard lane, then takes the enemy's wisdom rune |
| 10 | kill the enemy safe-lane carry and take his first tower with the siege wave |
| 10–11 | the offlaner has his initiation item |
| 12 | the mid first tower; ward the enemy's jungle |
| 14–19 | take and farm the enemy's big jungle |
| 20 | the Tormentor |
| 25 | the carry's third item, then Roshan |
| 25–28 | all outer towers; ward the high ground |
| 28–30 | siege or pick off, break one or two sides, then leave as enemies respawn |
| 35 | the next Roshan, then end |

He singles out the enemy safe-lane first tower as the most important tower today. An offlaner who buys a defensive item before his initiation item delays the whole team by about six minutes.

**Signal — partly observable.** Tower, Roshan, Aegis and Tormentor times and sides come from `objectives`, and item times from `items.purchases`. Rune pickups are collected but not published. Smokes are not recorded.

### F2 · 6:13–7:16 · midgame · don't fight on the enemy's ground before your next spike

**Claim.** The second wisdom rune at 14 minutes looks attractive but is a trap for the leading team. It hasn't reached its next item spike, the enemy has its base items, and the enemy's rune sits on defended high ground next to their tower. Take it only after the enemy offlane first tower falls, with a smoke and a ward on the rune.

**Signal — partly observable.** Tower times come from `objectives`. Wisdom rune fights are derivable from deaths near the rune, from `deathAnalysis.contexts` positions.

### F3 · 8:47–10:52 · midgame · answering tempo: mirror, respond or trade

**Claim.** The side under pressure has three tools:
- **Mirror** the leader's moves, such as the pre-horn smoke and the rune control.
- **Respond:** when the enemy mid ganks your wisdom rune, teleport onto it and punish him.
- **Trade:** when the leader takes your carry's first tower at 10 minutes, don't defend it; split-push their mid or their safe-lane tower instead.

**Signal — partly observable.** Towers traded in the same window come from `objectives`. Teleports are collected but not published.

### F4 · 10:52–12:56 · midgame · the losing side must plan objectives in advance

**Claim.** A losing side that starts thinking about the Tormentor at 20 minutes has already lost it. Prepare in advance:
- take the tower nearest to it;
- pick off a core under smoke just before, as a carry farming alone;
- ward and sentry the area.

Against the leader's Roshan at 25, keep their carry from his third item with ganks, or steal Roshan early. With a stolen Aegis, don't rush the high ground. Take the outer towers and jungles, and drag the game toward the late game, where tempo matters less. The second Aegis is the one to siege with.

**Signal — partly observable.** Roshan, Aegis and Tormentor events come from `objectives`. Pick-offs are derivable from kills and positions.

## Exercises the coach gave

None.

## Not taken

- The claim that one side has a large structural win-rate advantage, which depends on the patch's map and statistics.
- The exact rune and objective minutes as current facts (7.39e).
- Hero examples and the sponsored segment.

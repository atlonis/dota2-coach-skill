# 02 · BSJ coaches a 2,200 MMR carry (Anti-Mage)

- **Video:** [BSJ Dota 2 Coaching 2200, Carry](https://youtu.be/9rlRD3epTkg) · Dota Dojo · 2026-05-12 · 68 min · English
- **Patch at publication:** 7.41c. Named items below illustrate a principle and are not recommendations.
- **Type:** paid one-on-one coaching session, two replays; the second covers only the 30-minute mark
- **Subject:** position 1, an Anti-Mage main at about 2,200 MMR. The player's own goals were laning, the transition out of lane, and chain deaths in the midgame.
- **Source:** auto-generated captions only; the replay itself is not visible

## Main finding

The coach judged the player's lane mechanics and concepts as solid and told him explicitly not to change them. He named two lane problems as the focus:

1. Lane items did not match the player's own, correct description of what his hero needs in lane.
2. After getting a kill in lane, he did not set the wave before the enemy respawned.

After the lane, the player left the one uncontested wave before his farming item. By the coach's estimate this cost 3–4 minutes on that item. Fights should grow out of the farming route, not replace it.

## Findings

### F1 · 6:30–15:20 · lane · items must match the hero's lane problem

**Claim.** The coach asked the player what his hero's lane weakness is: poor sustain, and getting poked out of lane. The answer was right, but the purchases did not follow from it. A hero whose spells scale poorly grows in lane through items alone. Useful lane items either help the aggressive plan or let you keep farming while being harassed; anything in between is wasted gold. As an example, upgrading a cheap item that only pays off with many charges is wasted gold in a lane where it will not get them.

**Signal — observable.** `items.purchases` before 10:00, including the pre-game window. `mechanics.items` explains what each purchase does, and `lane.opponents` gives the matchup. Whether an item fits the plan is a review judgement, not a data fact.

### F2 · 15:50–25:20 · lane · after a lane kill, set the wave before the respawn

**Claim.** When an enemy laner dies, spend the time in one of two ways before they return. Either shove the wave hard, or deny your own ranged creep and draw aggro so the wave pushes back to you. Otherwise the victim respawns at full health against a half-health player and the kill backfires. The coach's general principle is that what an enemy prevents while alive tells you what to do while they are dead. In this lane that was hitting creeps. So the measure of lane play is how much time you spend not hitting creeps when you could be.

**Signal — derivable.** For each player kill before 10:00 in `events.kills`, count the player's last hits in `events.cs` and the denies over the next 30–60 seconds, and the health lost afterwards. Health is not recorded, but a death soon after is.

### F3 · 25:45–28:30 · lane to midgame · four heroes in one lane

**Claim.** When teammates rotate in and too many heroes share a lane, reassess the map. One of the two cores should take the free lane. In public games, react to what teammates are actually doing, not to what they should be doing.

**Signal — derivable.** Allied positions near the player from `participants` and the position rows. Not computed yet.

### F4 · 29:30–37:40 · early midgame · a slow-farming carry stays glued to the free wave

**Claim.** Before the farming item, a carry who clears jungle camps slowly should plan around the next uncontested wave in a specific lane. Moving toward a fight is fine only when farm lies on the way. Every missed free wave is a large loss at that stage. The missed waves, together with the two lane moments above, moved the farming item from about 13–14 minutes to 17.

**Signal — derivable.** The item timing is observable from `items.purchases`; last hits per minute by phase come from `phases` and `series`. A missed wave is derivable in principle, because lane waves arrive on a fixed schedule and the position row shows where the player was. Not computed yet.

### F5 · 37:40–48:00 · midgame · farming route first, fights second

**Claim.** Every fight a carry joins should feel like a choice he had over farming. Plan the farming route, then look for a way to connect to a fight from it, through a teleport or a twin gate, and only if the fight looks good. By the coach's observation, 2–3K players judge well when to fight but give up their farm to get there. Before about 25–30 minutes a carry's default is to play away from the team, roughly 85:15. After 30–35 minutes the default flips: stay with the team and split off only briefly to clear a wave.

**Signal — derivable.** The player's last hits in the minute before each OpenDota teamfight interval, and whether he was inside the fight. `phases` gives last hits per minute around the 25–30 minute boundary.

### F6 · 50:00–54:00 · midgame · a four-step item plan for a carry

**Claim.**
1. The lane items the lane actually needs.
2. Farm acceleration.
3. An item that keeps you alive while farming.
4. A choice between surviving more and killing more.

Kill threat depends on whether the team has disables, because a carry without stuns on his side rarely solo kills. The player's fourth item went for kills in a game where his team could not set them up.

**Signal — observable.** Purchase order comes from `items.purchases` and ability texts from `mechanics.heroes`. Whether the team has disables needs hero knowledge beyond the recorded match facts, so it is a review judgement.

### F7 · 55:25–58:30 · midgame · chain deaths from overchasing

**Claim.** The three deaths at 30 minutes began with a logical move, attacking the only enemy in reach while every lane was pushed. They turned into overchasing once the goal was already met. The coach's prevention is a post-game question: why were we fighting this hero in the first place? Once the fight's purpose is achieved, go back to farming.

**Signal — partly observable.** Deaths close together come from `deathAnalysis.contexts` and `deathAnalysis.patterns`, and kills per phase from `phases`. The times of the player's kills are collected in `events.kills` but not published.

## Coaching method

- He opened by asking what the player wanted from the session and how he describes his own play style.
- He asked for the player's reasoning before correcting it, and tied each correction to the player's own words.
- He named what was already good and said explicitly not to change it: last hitting under tower, aggression, and use of the pull camp.
- He narrowed the homework to two lane focuses and one concept.
- He set up a follow-up. The next replay should come with written notes on:
  - the reasoning behind the lane items;
  - which lane to play from 10 to 14 minutes;
  - why the item after the survival item was chosen.

  It should be a game where the player applied the lesson and was unsure it was right.

## Exercises the coach gave

- In lane, work only on two things: items that match the hero's lane problem, and setting the wave after every lane kill.
- Before the farming item, name the next uncontested wave and be at it.
- Before joining a fight, check that the move came out of the farming route.

## Not taken

- Specific item choices for this hero and matchup, and the skill-point choice against the lane opponent (7.41c, hero specific).
- The coach's comments on how strong a particular item's illusions are this patch.

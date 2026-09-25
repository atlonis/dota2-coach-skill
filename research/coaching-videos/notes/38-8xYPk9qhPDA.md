# 38 · Support Heaven: supports lose lanes by applying no pressure

- **Video:** [I Coached 100+ Supports. This Is Why They Lose Lanes.](https://youtu.be/8xYPk9qhPDA) · Support Heaven · 2026-09-09 · 12 min · English
- **Patch at publication:** 7.41e. Hero examples are left out.
- **Type:** guide drawn from the coach's reviews of students from 500 to 8K MMR
- **Source:** auto-generated captions only

## Core idea

The coach watched hundreds of his students' support replays. The most common reason supports lose lanes is not pulling or the carry. They die in trades they shouldn't take, or they do nothing but pull. What separates a low-ranked support from an Immortal one is creating pressure and handling it.

Pressure means making the enemy change what they do because of you: miss last hits, back off, or never approach the wave. A support who sits behind the core and only pulls gives the enemy a free 50/50 lane.

## Findings

### F1 · 1:03–3:41 · lane · a support's job is pressure

**Claim.** Every hero has its tool for pressure:
- long-range attack damage;
- a big nuke;
- a catch that kills from full health;
- a spell that drives enemies out of the lane.

Know how your hero applies pressure and play accordingly. A ranged support who never hits enemies is "worse than a creep": it only takes XP.

**Signal — partly observable.** Hero damage in the lane phase comes from `phases`, and the hero's tools from `mechanics.heroes`. Missed last hits by the enemy core are in the sources but not published.

### F2 · 3:41–5:46 · lane · keep the lane where it favours you

**Claim.** Think of the lane as a gradient: where the waves meet is exactly as good for one side as it is bad for the other. Near your tower, the enemy core farms at risk. Once the enemy support pulls the meeting point to just outside their tower, their core is safe and yours may not farm. The support keeps the lane where it helps, with pulls and half-pulls.

**Signal — not observable.** Wave position is not recorded. Pulls are not recorded.

### F3 · 5:46–6:49 · lane · take 2v1 trades, avoid 1v2

**Claim.** Create two-against-one trades:
- harass one enemy out of the lane;
- pull to split the enemies, then collapse on one;
- trade next to a core who can join fast.

The reverse holds too: if the enemies can collapse and your core can't help, treat every trade as a potential 1v2.

**Signal — partly observable.** At each death, nearby allies and enemies are in `deathAnalysis.contexts`. Trades without a death are not recorded.

### F4 · 6:49–7:53 · lane · base aggression on the creep count

**Claim.** Trades are good when your side has more creeps: the enemy takes creep damage if he answers. Also, a core with five last hits to take should take them, not start a fight. The coach's line: base your aggression on creeps.

**Signal — not observable.** Creep counts are not recorded.

### F5 · 7:53–10:29 · lane · fight when the balance changes

**Claim.** Every lane has moments when one side suddenly becomes stronger:
- level 2 first;
- a new spell or item;
- a key enemy spell used;
- the enemy out of regen.

Look for what changed in the last few seconds. Be aggressive then, not just because you can, and respect the enemy's spikes until you catch up.

**Signal — partly observable.** The player's levels are derivable from `series.xp`, skill times come from `skillBuild` and item times from `items.purchases`. Enemy levels, spells and regen are not published.

## Exercises the coach gave

- In every lane, check the four questions: where the wave meets, whether a 2v1 is available, who has more creeps, and whether a power spike just changed the balance.

## Not taken

- Hero examples and damage numbers.
- The coaching promotion.

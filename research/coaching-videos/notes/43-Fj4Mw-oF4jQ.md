# 43 · BSJ: keep the lane in equilibrium with denies

- **Video:** [How to Maintain Lane Equilibrium (Last Hitting AND Denying Creeps) - Dota 2 Fundamentals (Episode 3)](https://youtu.be/Fj4Mw-oF4jQ) · BSJ · 2021-03-27 · 8 min · English
- **Patch at publication:** 7.28c. The deny rewards mentioned are patch dependent and left out.
- **Type:** fundamentals drill for newer players, recorded in a practice lobby
- **Source:** auto-generated captions only

## Core idea

A player who only last hits enemy creeps pushes the lane toward the enemy. Early on, the goal is gold and XP, not buildings. The closer the lane is to your tower, the safer you are: the tower protects you, and its aura adds armour and regen. Keep the lane balanced by also attacking your own creeps: deny them.

## Findings

### F1 · 2:16–3:52 · lane · last hitting alone pushes the lane

**Claim.** After three waves of last hitting only enemy creeps, the lane had moved far from your tower, with six of your creeps pushing. In the first 5–10 minutes that is bad: it moves the fight away from the protection of your tower.

**Signal — not observable.** Wave position is not recorded. Last hits and denies by minute come from `series`.

### F2 · 3:52–5:25 · lane · deny to keep the balance and take XP away

**Claim.** You can attack your own creep once it is below half health. A deny keeps the gold from the enemy and removes part of the XP they would get. So denies can matter as much as last hits.

**Signal — observable.** Denies by minute from `series.denies`, and against peers from `baseline.comparisons`.

### F3 · 5:25–7:29 · lane · a training rule: one hit on your own creep after each last hit

**Claim.** As training wheels, after every last hit, attack one of your own creeps at least once. If a creep attacks you, attack-command one of your own units and step back behind your creeps so the enemy creeps pick a new target.

**Signal — partly observable.** Denies by minute from `series`. Creep aggro is not recorded.

## Exercises the coach gave

- In a practice lobby, over three waves, take at least 10 of 12 last hits while hitting your own creep once after each one.

## Not taken

- The deny reward values, which change with patches.

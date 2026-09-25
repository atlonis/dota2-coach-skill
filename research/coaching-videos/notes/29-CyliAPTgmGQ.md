# 29 · BSJ: "Farm or fight" is the wrong question

- **Video:** [Why 'Farm or Fight' Is the Wrong Question](https://youtu.be/CyliAPTgmGQ) · BSJ · 2026-08-09 · 21 min · English
- **Patch at publication:** 7.41e. The hero examples come from the coach's own carry game and are not taken as rules.
- **Type:** guide on carry decision-making, with annotated moments from one game
- **Source:** auto-generated captions only

## Core idea

Fighting and farming are not a binary choice. Fighting covers any hero-to-hero interaction meant to kill, from a 1v1 pick-off to a 5v5. The decision is made in three steps: notice that a fight is likely, check your readiness, then judge whether you are strong enough.

## Findings

### F1 · 0:30–5:40 · midgame · four signs that a fight decision is due

**Claim.**
1. Most enemies are missing from the map while waves are pushed into towers on both sides.
2. Your side has just spent resources on a kill or an objective.
3. Heroes from both teams stand close to each other.
4. A fight has already started elsewhere.

The first skill is noticing these moments, one indicator at a time.

**Signal — partly observable.** Sign 2 is partly observable: objectives are in `objectives`, while kill times are collected but not published. Sign 3 is derivable from all ten position rows, but not computed. Sign 4 is derivable from OpenDota's teamfights; the artifact shows a fight only around the player's deaths. Sign 1 is not observable: we have no vision data and no wave positions.

### F2 · 6:40–9:45 · any stage · readiness check before deciding

**Claim.** Check health and mana, then key cooldowns, then items. Then ask two questions. First, "what kills me, and will I die to it?" Second, what can I contribute: absorbing spells, control, or damage? For a carry, survivability comes first, because dying in a fight is the worst outcome. Work out the enemy's kill threat before the game.

**Signal — partly observable.** Items are observable from `items.purchases`; the mechanics section says what each item and ability does. Health, mana and cooldowns are not observable.

### F3 · 11:20–13:30 · midgame · who farms aggressively after a kill

**Claim.** After a kill, the team usually separates and farms again. The hero with health, mana and cooldowns takes the forward, contested farm. The depleted hero takes safe farm, even by teleporting. One wrong choice here, such as the wrong hero teleporting away, starts a chain of small lost fights that feels like the team is randomly feeding.

**Signal — derivable.** Each of the player's kills followed by a teleport (`events.repositions`) or by a death within the next minute. Allied deaths come from the position and death rows. Not computed yet.

### F4 · 13:59–15:05 · midgame · never teleport away from a looming fight

**Claim.** When heroes are gathering near each other, teleporting to a far lane is almost always wrong: it removes your option to join. If you are not ready, walk to nearby farm and teleport in once your item or cooldown is ready.

**Signal — derivable.** A `teleport_item` reposition away from where most heroes stand shortly before a teamfight starts.

### F5 · 18:12–19:15 · midgame · with enemies missing, connect or stay safe

**Claim.** When the enemy is missing from the map, do not push a lane alone. Either join your team or stay somewhere safe.

**Signal — partly observable.** The player's distance from allies and from their own side's towers, from positions. Whether the enemy is missing is not observable.

### F6 · 15:36–17:10 · teamfight · chase only with resources left

**Claim.** After a kill inside a fight, keep chasing only if your key spell and health are still available. Otherwise go back to farming.

**Signal — not observable.** Resources are not recorded. The kill and the player's position after it are in the collected events, not in the artifact.

## Exercises the coach gave

- Pick one indicator from F1 and look for it in every game until you notice it without thinking.
- Before each decision, run the readiness check: health and mana, cooldowns, items. Then ask what kills you, and whether you can absorb, control or deal damage.

## Not taken

Hero-specific survivability judgements about the heroes in the example game.

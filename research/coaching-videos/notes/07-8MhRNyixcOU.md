# 07 · Khezu reviews a 10K MMR offlaner

- **Video:** [Ex Pro replay review of top 500 OFFLANE PLAYER](https://youtu.be/8MhRNyixcOU) · Khezu Dota Coaching · 2026-04-04 · 31 min · English
- **Patch at publication:** 7.41a.
- **Type:** paid written replay review, recorded with voice-over; the player is not present
- **Subject:** position 3 Legion Commander at about 10K MMR in Southeast Asia, against a Weaver and Phoenix lane
- **Source:** auto-generated captions only

## Main finding

By the coach's account, the player's cores carried this game. The player's own problems were in the early game and the midgame:

1. **Too much damage in lane.** He took bad trades and spent his gold late, made worse by losing the courier with regen on it.
2. **He teleported back to his lane after every death.** That left no teleport available for 80 seconds.
3. **He walked into the tower's teleport circle** while pushing with no enemies visible.
4. **He wasted downtime.**
5. **In the midgame he rarely moved with the supports who enable his plays.**

## Findings

### F1 · 0:33–4:40 · lane · use downtime on the wave

**Claim.** Lane downtime is valuable in every role. Instead of standing idle, go back and block your next wave for better lane control. Stand with your own creeps and tower to share their health regeneration. Block so that the flagbearer creep is not the first to die.

**Signal — not observable.** Creep blocking and regen sharing are not recorded.

### F2 · 2:37–6:52 · lane · manage health and gold together

**Claim.** When you have lost your regen, trade less. Spend gold as soon as you have it, using quick-buy, so you aren't dying with unspent gold. Send the courier to a safe spot, not to you in lane. Against a lane that wins by constant right clicks, the next armour item was far too late.

**Signal — partly observable.** Purchase times come from `items.purchases` and deaths from `deathAnalysis.contexts`. Unspent gold at death is not in the artifact, although OpenDota records gold per minute. Courier deaths are in `objectives`.

### F3 · 5:49–6:20 · lane · don't chase away from a full wave

**Claim.** A chase that leaves four creeps' worth of gold and experience dying unattended is worse than staying, farming and playing for your level and item timings.

**Signal — derivable.** The player's position during a chase against the wave. Last hits missed during a kill are derivable from `events.cs` and `events.kills`.

### F4 · 8:26–10:05, 13:42–14:15 · early game · every death costs your teleport too

**Claim.** After a death, teleporting back to your lane leaves you with no teleport for rotations and defence for about 80 seconds. With a fast hero, walk back instead and keep the teleport.

**Signal — derivable.** A death in `deathAnalysis.contexts` followed by a teleport in `events.repositions`, then the next teamfight the player could not reach. Not computed yet.

### F5 · 12:09–14:15 · early game · respect the teleport circle

**Claim.** Do not hit an enemy tower in the area enemies can teleport onto when you see no one on the map, or right after a key enemy respawns. Drag the wave out instead and let the creeps damage the tower.

**Signal — derivable.** The player's position near enemy towers from the position row, with enemies missing from view. Deaths near enemy towers are in `deathAnalysis.contexts`.

### F6 · 10:36–11:38 · early game · three-hero timing

**Claim.** When your support's ultimate, the mid's key item and your own level all come up together, start moving as a group of three. Watch the map and the enemy triangle early instead of noticing late.

**Signal — not observable.** Cooldown readiness is not recorded. Grouping is derivable from positions.

### F7 · 19:56–26:10 · midgame · know who stops your play

**Claim.** Identify the one enemy hero whose save spell breaks your pick-off. Either jump him, jump when he is out of range, or wait until he has used his spell. Midgame pick-off heroes should play the side lanes and gate control with their supports rather than the middle of the map.

**Signal — partly observable.** Deaths and kills with nearby enemies from `deathAnalysis.contexts`. The save spell's cooldown is not observable.

### F8 · 19:26–20:00 · midgame · don't show yourself on waves for no reason

**Claim.** Walking through a wave in view of an enemy ward shows your position and invites a gank.

**Signal — not observable.** Enemy vision is not recorded.

## Coaching method

- This is a written review delivered as a list of points, grouped by stage.
- The coach separates what was solid, the starting items and some aggro, from what cost the game, and closes by naming the stage where it went wrong.

## Exercises the coach gave

- After a death with a fast hero, walk back to your lane and keep the teleport.
- In every lull, go to your next wave and block it.
- In the midgame, name the enemy hero who stops your play, and time your jumps around him.

## Not taken

The item choices named late in the review (7.41a).

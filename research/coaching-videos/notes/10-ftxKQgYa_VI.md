# 10 · BSJ coaches Jenkins on a position 4 hero

- **Video:** [I coached Jenkins on my favorite dota hero](https://youtu.be/ftxKQgYa_VI) · BSJ · 2025-12-09 · 71 min · English
- **Patch at publication:** 7.39e.
- **Type:** coaching session between two friends, both former pros, with long digressions on mentality
- **Subject:** position 4 Slark at about 9,700 MMR. The player's complaint: a very low win rate on the hero, dying in fights, and not knowing when to join fights and when to make space.
- **Source:** auto-generated captions only

## Main finding

The player knew the concepts but was using general "roaming four" tools that do not fit this hero. The coach calls this noise instead of signal. For a melee roaming support, the core lane job is manipulating the lane equilibrium, not heads-up trading or leaving to make pressure. Outside the lane:

- every death came while holding an unused spell;
- the player's harsh self-talk was itself the biggest drag;
- he treated a won game as already over.

## Findings

### F1 · 2:36–5:44 · lane · a melee support's job is to move the wave

**Claim.** A melee support should shape the lane for his ranged partner: draw creep aggro so the wave pulls back, block the small camp, body-zone. Pulling the lane back toward your tower counts as a mini-objective, like the lotus or the watcher.

**Signal — not observable.** Wave position and aggro are not recorded.

### F2 · 5:44–10:24 · lane · after losing trades, switch to evasive

**Claim.** After the lane gave up early kills, stop contesting heads-up. Aggro defensively, keep the lane at your tower, and block the small camp. Accept being two or three levels behind at minute seven, then leave for bounties and watchers. Tilt after an early death made him try to "make up for it" with more fights.

**Signal — partly observable.** Early deaths come from `deathAnalysis.contexts`, levels are derivable from `series.xp`, and lane `outcome` is recorded. The switch in play style is not observable.

### F3 · 10:55–13:00 · lane · leaving a losing lane can backfire

**Claim.** Leaving a bad lane to "create pressure elsewhere" also frees the enemy's roaming support to go where you went. If the lane can be manipulated, keep him tied to the lane instead. Plan the lanes before the game starts, based on what your support can do with that particular safe lane.

**Signal — derivable.** The player's absence from the lane against the lane partner's deaths and last hits. Not computed yet.

### F4 · 16:08–19:00 · method · signal versus noise

**Claim.** An experienced player already knows most concepts. Improvement often comes from clearing the noise: dropping general concepts that do not apply to this hero and this situation, and keeping the few that do. Reasoning from a past game with different heroes is noise.

**Signal — not observable.** This is a coaching frame.

### F5 · 22:23–25:30 · midgame · never fight where you last showed

**Claim.** A hero built on surprise should always seek favourable vision, information and numbers. After showing somewhere and getting a kill, leave: go through the gate, walk back for experience, pull a camp. Fighting again in the same spot is just a normal fight, which throws the advantage away.

**Signal — derivable.** Consecutive kills, deaths and teamfights in the same map area, from positions and events.

### F6 · 30:40–32:00, 51:18–52:20 · any stage · don't die holding spells

**Claim.** On a hero whose longest cooldown is about 50 seconds, almost every death comes with an unused spell. Use the defensive button preemptively when dewarding or killing a courier in enemy territory. The coach's target: fewer than three held-spell deaths per game.

**Signal — partly observable.** Each death context lists the player's own ability and item uses in the window before the death (`ownAbilityUses`, `ownItemUses`). Whether a spell was available is not observable.

### F7 · 48:08–50:15 · midgame · shield the likely gank target

**Claim.** As a roaming save support, keep track of which ally is the enemy's likely target and stand between him and the enemy. The most annoying thing for the enemy is running at that ally and meeting a support they cannot kill. Farm only when no ally is exposed.

**Signal — derivable.** The player's distance to each ally and the allies' deaths, from positions and events.

### F8 · 32:13–37:00, 56:28–1:02:40 · any stage · mentality: reset, don't pre-decide

**Claim.**
- Self-blame is noise. After a mistake, ask a reset question, "what's next?", and move on.
- Thinking the game is already won or lost helps in 0% of cases, and a 15K lead lost to a careless play shows it.
- Be intentional about why you are playing this game, to try hard or to have fun, and don't blur the two.

**Signal — not observable.** No chat or mental-state data. Throws are partly visible in `teamEconomy`.

## Coaching method

- He asked what the player enjoys about the hero ("being the annoying guy nobody can kill") and built the session around helping him do that.
- He told the player he was not teaching new material, only pointing to what he already knows.
- He set a measurable target: held-spell deaths per game.
- He recommended practising one mechanic in demo mode.
- He treated the session as two-way and accepted a tip from the player in return.

## Exercises the coach gave

- After every death, check whether you held a spell, and keep the count under three per game.
- Before the game, plan what your support can do with each of your lanes.
- In demo mode, practise the save combination until it is automatic.

## Not taken

Item and shard choices, and one hero-specific trick (7.39e).

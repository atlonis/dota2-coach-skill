# 40 · ZQuixotix: how creep aggro works

- **Video:** [Understanding Creep Aggro | Dota 2 Guide](https://youtu.be/Bcg3VVuPsXs) · ZQuixotix · 2023-12-10 · 29 min · English
- **Patch at publication:** 7.34e. The ranges and durations measured in the video are left out; the rules below are its tests on that patch, and the author notes that some differ from the wiki.
- **Type:** mechanics guide with tests in a practice lobby
- **Source:** auto-generated captions only

## Core idea

Creep aggro is a hidden ability every hero has. Issuing an attack command on an enemy hero near enemy creeps makes them target you for a few seconds, and then the ability is on a short cooldown. Knowing this gives four skills:
- draw the wave toward your tower;
- harass without drawing the creeps;
- shed creep aggro;
- interrupt enemy pulls.

## Findings

### F1 · 0:30–4:39 · lane · the creeps' default targeting

**Claim.** Creeps attack the nearest target. Once locked on a target inside their attack range, they don't switch; they reconsider only when the target leaves that range. They prefer a unit attacking their allies. They chase a hero while they see him, and give up at the last point they saw him.

**Signal — not observable.** Creep targeting is not recorded.

### F2 · 4:39–8:47 · lane · drawing aggro to pull the wave back

**Claim.** The attack command, not the attack itself, draws aggro, so a command on any visible enemy hero works, even from the top bar. To pull the wave toward your tower, issue the command, walk back, and let the creeps hit you before the lock ends; otherwise they turn around.

**Signal — not observable.** Orders and wave position are not recorded.

### F3 · 8:47–13:57 · lane · harassing without drawing aggro

**Claim.** Issue the attack command while outside the creeps' range, or out of their sight behind trees. The hidden ability goes on cooldown without drawing anything, and you can then walk in and hit the enemy for free. Spells don't draw aggro while the creeps are already fighting. Hitting from the fog behind a tree line gives more free hits, which is why supports harass from there.

**Signal — not observable.** Hits on heroes are not recorded individually. Hero damage in the lane phase comes from `phases`.

### F4 · 13:57–16:01 · lane · damage over time can draw aggro, and reveal wards

**Claim.** Damaging an enemy hero near his creeps makes them look for the attacker. A damage-over-time spell on a hero who runs into his wave draws the creeps to the caster if they can see him. A caster who should have been out of sight but still drew aggro has found an enemy ward.

**Signal — not observable.** Aggro and vision are not recorded.

### F5 · 16:01–18:04 · lane · early waves can't be aggroed far from the tower

**Claim.** The first wave can't be aggroed until it meets the enemy wave. Until about five minutes, later waves can't be aggroed until they come near their own first tower, so creep drags must start there. After five minutes, the rule is gone.

**Signal — not observable.** Aggro is not recorded.

### F6 · 18:04–23:21 · lane · shedding aggro means leaving attack range

**Claim.** Attacking your own unit doesn't "de-aggro"; it makes the creeps re-prioritise, and sometimes they pick you again. The reliable way is to leave their attack range, then attack-command something of your own along your path. An ally can take the aggro off you by issuing his own attack command. Catapults are the lowest priority: creeps switch to any hero who walks in.

**Signal — not observable.** Aggro is not recorded.

### F7 · 23:52–28:02 · lane · neutral camps and pulls

**Claim.** Neutral creeps follow similar rules but return home after a leash distance. Once active, they can be aggroed by an attack command on an enemy hero, which is how a pull can be interrupted before the fight starts. Once they fight the lane creeps, it can't be stopped.

**Signal — not observable.** Pulls are not recorded.

## Exercises the coach gave

- In a practice lobby, show the creeps' acquisition range on screen and test drawing, harassing and shedding aggro.
- Practise the four skills: pulling the wave back, harassing without aggro, shedding aggro, interrupting pulls.

## Not taken

- The exact ranges, durations and distances, which depend on the patch (7.34e).
- The advanced last-hitting tricks the author mentions but doesn't cover.

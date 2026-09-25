# 04 · BSJ coaches a 3,880 MMR soft support

- **Video:** [BSJ Dota 2 Coaching 3880 Support](https://youtu.be/auFX6W2kCRg) · Dota Dojo · 2026-04-14 · 70 min · English
- **Patch at publication:** 7.41b. Hero examples illustrate the principles.
- **Type:** paid coaching session, one replay
- **Subject:** position 4 Spirit Breaker at about 3,900 MMR, a returning student. His complaint: games with an early lead that end in a throw.
- **Source:** auto-generated captions only

## Main finding

The coach found the player's map movements good. He named three habits that turn a lead into a loss:

1. **No reset after won fights.** After early and mid fights the player does not use the time the enemies are dead to take the waves and refill resources.
2. **No clear idea of the next fight.** The player is not aware of when and where the team will fight again: which cooldown the team is waiting for, and which objective is next.
3. **Following plays he doesn't believe in.** He joins teammates in them instead of stating what he is doing and why.

A secondary issue: repeated trips to base for mana, which a cheap regen item would have solved.

## Findings

### F1 · 3:50–15:00 · lane · drag the wave against a carry who wants a still lane

**Claim.** Melee carries without stuns or gap-closers want the lane to sit still in front of their tower. Dragging creeps into the jungle hurts them. Before dragging, check whether the enemy carry is mobile enough to punish a support standing alone. The drag also sets up the lane you are about to leave: the offlaner is not left alone one against two with the wave at the enemy tower.

**Signal — derivable.** The enemy carry's last hits are in OpenDota for all players, but the artifact keeps only the selected player's series. Creep positions and drags are not observable.

### F2 · 18:30–20:00 · lane · leave the lane in a state that suits your partner

**Claim.** Before a support leaves to roam, he can push the lane back toward his side, for example by drawing aggro with full health. What it costs the lane partner depends on where the wave is left.

**Signal — derivable.** The lane partner's last hits and deaths while the player is away, from per-player OpenDota series and the position row. Not computed yet.

### F3 · 20:32–24:10 · lane to midgame · manage resources with small items

**Claim.** Repeated trips to base for mana waste the support's map presence. When you notice "I want to stay on the map but I have no mana", react with a cheap regen or charge item. This applies to every hero.

**Signal — partly observable.** Regen purchases and their times come from `items.purchases`. Trips to base are derivable from the position row. Mana itself is not observable.

### F4 · 25:40–31:50 · midgame · after a won fight, extract the map

**Claim.** The time the enemies are dead is when the map is yours, "like robbing a house while nobody is home". Teleport to the waves, take the lotus, and refill resources, so you are ready when the key cooldowns return. Pushing a tier-2 tower while your own waves die to your towers is how a lead evaporates. When you have spent your ultimate or your resources, check the lanes and reset.

**Signal — derivable.** From the end of each won OpenDota teamfight interval, time to the player's next wave last hits or teleport, and the waves lost. Towers lost soon after a won fight come from `objectives`.

### F5 · 33:55–36:35 · midgame · a support connects to the strongest heroes

**Claim.** A support's job is to see which teammates are strongest right now, the one with the key ultimate or the damage, and connect to them. The other option is to split-push obnoxiously. Standing with weak teammates on the far side of the map is neither.

**Signal — derivable.** Distance from the player to each ally over time, from the position rows. Not computed yet.

### F6 · 38:05–41:15 · midgame · which farm to take depends on the score

**Claim.** Taking the dangerous farm protects the cores when your team is losing. When winning, take the passive farm away from objectives, so the cores are free to move at the enemy. Waves enable the team that is ahead to fight: with a 6K lead, no lane should sit uncleared.

**Signal — partly observable.** `teamEconomy` shows who is ahead. The player's position and wave last hits are derivable. Not computed yet.

### F7 · 41:15–44:50, 58:15–59:45 · midgame · fight on your key cooldown

**Claim.** Farm and split-push until the ability, item or cooldown your team fights around is ready, then do something powerful. In the example the powerful move was Roshan near your own wards. Always know where on the map you want the next fight. A lead invites careless fights; the timing still has to be calculated.

**Signal — partly observable.** Roshan and other objectives come from `objectives`. Cooldowns are not observable.

### F8 · 45:20–55:00, 1:04:00–1:07:40 · any stage · make your own mistakes; say what you do

**Claim.** Do not join plays you do not believe in, because following same-bracket teammates keeps you at their MMR. The coach disagrees with "better to be wrong together" outside pro play. Tell the team what you are doing and why, for example "their carry's BKB is down, I'm taking top", rather than giving orders. The exhaustion comes from expecting an answer, not from the silence.

**Signal — not observable.** No chat or intent data.

### F9 · 1:02:55–1:04:00 · late game · don't go high ground on impatience

**Claim.** When your own carry has just spent his BKB and is one item short, retreat and let him finish the item before attacking high ground again.

**Signal — partly observable.** High-ground attempts are derivable from positions near the enemy's base towers. The BKB state is not observable.

## Coaching method

- He opened by asking why the player moved from carry to support and what a successful session would mean.
- He asked "what exactly are you afraid of?" and "what is stopping you from going there?" until the root belief came out: "my role is to take the dangerous farm". Then he rewrote the belief with its condition: true when losing, false when winning.
- He checked mid-session whether the material was new or a reminder; the player said mostly a reminder.
- He framed the issue as speed: the player finds the right move, but a minute and a half late.
- He shared his own struggle with tilt instead of prescribing from above.

## Exercises the coach gave

- After every early and midgame fight you took part in, check the lanes and reset before looking for more.
- Name the ability, item or cooldown your team fights around, and line up your movements to be with the team when it is ready.
- Communicate what you are doing and the reason, not what others should do.

## Not taken

Hero-specific build advice and matchup remarks (7.41b). The detailed creep-drag path for one side of the map is kept only as the general idea.

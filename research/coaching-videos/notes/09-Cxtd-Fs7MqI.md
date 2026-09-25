# 09 · DuBu reviews his own support replays

- **Video:** [Reviewing My Own Replays: Laning Mistakes & Early Game Decisions](https://youtu.be/Cxtd-Fs7MqI) · DuBu · 2026-09-24 · 20 min · English
- **Patch at publication:** 7.41f.
- **Type:** self-review. A high-MMR support player walks through three of his own recent games and names his own mistakes.
- **Subject:** positions 4 and 5, early game only
- **Source:** auto-generated captions only; the speaker's English is non-native and the captions are rough

## Core idea

In lanes that should have been won, small mistakes each cost a little, and together they turned a winning lane into an even one:

- overstepping;
- a missed body block;
- a missed level-three timing;
- a smoke used without a purpose;
- a reflexive teleport.

The biggest error, repeated in two games, was reacting to a losing lane instead of pressing the lane that was winning.

## Findings

### F1 · 1:33–2:36 · lane · don't overstep when the enemy is already zoned

**Claim.** When the enemy laners are not even hitting creeps, the zone is working. Stepping forward to show off, or to fight two against one, risks losing all your health and your presence in the lane for nothing.

**Signal — not observable.** Positions exist, but zoning is not measurable from them.

### F2 · 2:36–5:42 · lane · know the level timings

**Claim.**
- After a lane kill, use the respawn time to pull and to bring regen by courier.
- Keep track of the moment to body block the camp.
- Before the enemy reaches level three, a strong duo is far stronger. Buy one more regen item to contest once more before that timing.
- At your own level three, use your disable at once.
- Waiting 20 seconds to take a full wave beats contesting a camp and missing the last hits.

**Signal — partly observable.** Kills and purchases are observable. Level timings are derivable from `series.xp`. Body blocking and pulls are not observable.

### F3 · 7:18–9:21 · early midgame · protect the lane that is winning

**Claim.** When the enemy roaming support is in your jungle, ping and scan for your mid, and block the rotation path. Wait for your team's timings, such as a teammate's level 6 or ultimate, before moving to a fight.

**Signal — not observable.** Scans and pings are not recorded. Rotations are derivable from positions.

### F4 · 10:24–11:27 · early midgame · check runes and items by clicking heroes

**Claim.** Clicking an enemy hero shows the rune he has picked up, such as haste. That turns into a warning to the lane before a gank.

**Signal — not observable.** In-game information gathering is not recorded.

### F5 · 10:56–11:57 · early midgame · smoke only with a timing and a purpose

**Claim.** A smoke used just to help a lane, with no timing and no purpose, is wasted. The better moment was after his own level 6, with an enemy dead: smoke to push the lanes, ward, and take the kill and the tower.

**Signal — not observable.** Smoke use is not in the artifact.

### F6 · 12:29–15:40 · early midgame · after respawning, don't reflexively teleport back

**Claim.** After a death, check which lane is vulnerable to a rotation, for example a mid losing its matchup. Walk to secure the lane experience instead, and keep your teleport ready for the other lanes. Teleporting straight back to your own lane left him with no play, and the enemy rotated onto the losing mid.

**Signal — derivable.** A death in `deathAnalysis.contexts`, then a teleport in `events.repositions`, then an allied death soon after. Not computed yet.

### F7 · 15:42–19:57 · early midgame · press the winning lane, don't service the losing one

**Claim.** When one lane is won hard, the move is to play there: pressure the tower with the siege wave, and bring the other support. Rushing to help the lane that is losing hurts the game. Even a kill won there costs the teleport and the timing. He named this as the mistake that cost the game.

**Signal — derivable.** The player's positions against each lane's outcome, from `lane` for the selected lane and per-player data for the others. Not computed yet.

## Coaching method

- Self-review: he lists one mistake per moment and says what he should have done instead, without excusing it.
- He separates a mistake that cost the game from mistakes that were only inefficient.

## Exercises the coach gave

- Before any rotation or smoke, name the timing and the purpose.
- After a death, decide where your teleport will be needed next before using it.

## Not taken

Hero-specific trade and nerf remarks (7.41f).

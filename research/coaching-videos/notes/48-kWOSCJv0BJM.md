# 48 · BalloonDota: the offlaner's recovery plan after a lost lane

- **Video:** [How to Play Offlane after LOSING Lane - Offlane Guide Dota 2](https://youtu.be/kWOSCJv0BJM) · BalloonDota · 2026-01-21 · 28 min · English
- **Patch at publication:** 7.40b. Hero and item specifics are left out.
- **Type:** gameplay with commentary. At about 8K MMR, the coach loses his lane on purpose by dying three or four times, then shows how to recover.
- **Subject:** position 3 Bristleback
- **Source:** auto-generated captions only; includes a coaching promotion

## Core idea

There is no secret to recovery: patience and discipline. After a lost lane:
- stop trying to win the lane or take the tower;
- push waves and farm jungle camps quickly;
- watch the map for clean-up kills near where you farm;
- don't die again until your survivability item;
- then play close to your team, commit softly, and let the enemy make mistakes.

The coach also stresses how much a lost lane costs: the enemy carry comes online, and the whole game becomes harder.

## Findings

### F1 · 4:45–5:46, 15:25–15:59 · lane · the deaths that lose a lane are avoidable

**Claim.** The deliberate deaths showed the common mistakes:
- rushing in;
- fighting at low health;
- fighting to the death;
- not noticing your own health;
- not backing off when your partner isn't with you.

**Signal — observable.** Lane deaths with their context come from `deathAnalysis.contexts`, with nearby allies and enemies.

### F2 · 4:45–6:50 · early game · once the lane is lost, switch to recovery

**Claim.** After the second or third death, don't attempt the tower: the enemy can teleport and kill you. Push the waves and farm the jungle as fast as you can, and rush the item that lets you survive the enemy's biggest threat.

**Signal — partly observable.** Deaths in the lane phase from `phases`, the lane result from `lane.selectedSideOutcome`, and item times from `items.purchases`. Jungle farm is derivable from the collected `events.cs`.

### F3 · 6:50–12:16 · early game · farm with awareness, and take only clean-up kills

**Claim.**
- Keep map awareness while farming, and take kills only when they happen near you as clean-ups.
- When the map is dark, infer where the enemies are and farm the other side.
- Farm a lane that pushes back to you. Leave a camp to a teammate already farming there.
- In fights, help with spells from the side and kite; don't stand in front.

The coach finished level 10 against the enemy offlaner's level 8 despite four deaths.

**Signal — partly observable.** XP by minute from `series.xp`. Kills and positions are collected but not published.

### F4 · 13:52–16:29 · midgame · with nothing to do, wait for the wave

**Claim.** When there's nothing to do, wait for the next wave and block it for safety. When enemies show elsewhere, shove your lane. Don't overextend near waves or towers before your key item.

**Signal — derivable.** The player's position relative to enemy towers before the key item, from the position row and `items.purchases`. Not computed yet.

### F5 · 20:27–24:41 · midgame · after the key item, play with the team and commit softly

**Claim.** Once the survivability item is ready, play close to your teammates and react to their moves. Commit softly: wait for the enemy's spells to be used, then go in. Don't fight to the death, and don't chase for kills. Without the item, stay at the edge of fights and help with spells.

**Signal — partly observable.** Deaths in fights with nearby allies from `deathAnalysis.contexts`, and item times from `items.purchases`.

### F6 · 25:12–25:45 · late game · save gold for buyback

**Claim.** Late in the game, keep gold for a buyback. With the Aegis on your team, play near the team and fight with it.

**Signal — observable.** Buybacks from `buybacks` and the Aegis from `objectives`.

## Coaching method

- He staged the mistakes himself to show both the cause and the recovery in one game.

## Exercises the coach gave

- After a lost lane, follow the recovery loop: push, farm, watch the map, clean up, don't die.

## Not taken

- Hero and item choices (7.40b).
- The coaching promotion.

# 32 · Gostix: how to stop playing on autopilot

- **Video:** [КАК НАУЧИТЬСЯ ДУМАТЬ В ДОТЕ?|гайд как обыграть всех на своём рейтинге](https://youtu.be/C2hn-YR3a9w) · Gostix · 2026-01-02 · 15 min · Russian
- **Patch at publication:** 7.40b. The hero-based item builds and hero tricks are left out.
- **Type:** general guide with one hero as the running example; scripted, no replay review
- **Source:** auto-generated captions only

## Core idea

Most players learn the basics and then play on autopilot: the same buys, the same routes, the same pings, game after game, hoping for a different result. The guide's cure is deliberate thinking every second:
- about the lane's resources and positions;
- about which role the team's draft needs;
- about where the enemies are and what they can do to you;
- after the game, about why each death happened.

## Findings

### F1 · 1:03–2:34 · mentality · play every game as if it were a final

**Claim.** Before the game, imagine you are playing a championship final with a huge audience, and act as if the result depends only on you. With that feeling it is hard to play on autopilot: you think about every creep and every hit.

**Signal — not observable.** No mental-state data.

### F2 · 3:35–4:38 · lane · free hits and wave timing

**Claim.**
- Hit the enemy when he can't answer: when he walks in front of full-health creeps, or when he tries to draw the wave.
- Watch the clock and the wave together. With the wave under your tower shortly before a rune or lotus timing, draw it toward that side, so you can contest the timing without losing farm.

**Signal — not observable.** Hits on heroes and wave position are not recorded. Hero damage in the lane phase comes from `phases`.

### F3 · 4:38–5:10 · lane · against a lane you can't win, fix the wave at your tower

**Claim.** Against a lane you can't stand in, block the first wave with your support so it meets at your tower, and farm there. Later, pull the wave back and hold it between your first and second towers. It isn't full farm, but it is the only play.

**Signal — partly observable.** Last hits and XP by minute from `series`, and the matchup from `lane.opponents`. Creep blocks and wave position are not recorded.

### F4 · 5:10–6:43 · items · choose the role the draft leaves you

**Claim.** Look at your team's heroes first:
- missing burst damage → build as a core;
- plenty of initiation and damage → absorb the enemy's attack and help your cores win the fight;
- a tempo team → buy auras.

Against the one enemy hero who decides the game, build step by step against his current and next items.

**Signal — observable.** `draft`, `items.purchases` and `mechanics.items`. The fit is a review judgement.

### F5 · 7:44–8:45 · lane · starting stats matter, even on a support

**Claim.** The enemy's spells seem stronger than yours often because of what was bought at the start. Many low-ranked players buy poor starting items. Early stats win trades, and a support may even buy a stat item to win the lane.

**Signal — observable.** Starting purchases from `items.purchases`, including the pre-game window.

### F6 · 8:45–9:15 · any stage · think about the enemy, not just your hero

**Claim.** High-level Dota is less about last hits and kills than about who outthinks whom. Keep asking where to place a ward so it survives, where the enemy team is, what it is doing, and whether it can come for you.

**Signal — not observable.** Vision and awareness are not recorded.

### F7 · 9:15–9:46 · review · study every death in the replay

**Claim.** If you died five times to smokes as a carry, open the replay and study each death in detail: why the enemies came out, how they found you, and why you didn't see it coming.

**Signal — observable.** The player's deaths with killers, nearby enemies and allies, recent teleports and teamfight membership come from `deathAnalysis.contexts`, grouped in `deathAnalysis.patterns`. Whether the enemy used a smoke is in the sources but not published.

### F8 · 10:49–11:49 · practice · train micro separately

**Claim.** Train skills in custom modes:
- last hitting and skillshots on the training map;
- blocking in a lobby that spawns waves;
- fighting and hero feel in a quick fighting mode.

Turn on quick-cast on key press for all abilities and items; the speed is worth losing the range preview. Keep graphics low so effects don't distract.

**Signal — not observable.** Settings and practice are outside the match.

### F9 · 13:24–14:56 · mentality · focus on yourself

**Claim.** Decide why you play. Stop arguing and flaming: teammates won't play better for it. Focus only on your own game. The best way not to tilt at teammates is to find a regular party.

**Signal — not observable.** No chat data.

## Exercises the coach gave

- Before each game, imagine playing a final where the result depends only on you.
- After a game with repeated deaths, open the replay and study each one: why they came, how they found you, why you didn't foresee it.
- Practise last hitting, blocking and skillshots in custom modes; turn on quick-cast.

## Not taken

- Hero-based builds and tricks, including the item routes against specific heroes (7.40b).
- The advice on second accounts and the channel recommendations.

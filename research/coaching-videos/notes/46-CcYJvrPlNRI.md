# 46 · A 15K coach plays mid at 2.3K and explains how to climb

- **Video:** [КАК ВЫБРАТЬСЯ С ЛОУ ММР НА МИДЕ](https://youtu.be/CcYJvrPlNRI) · Ueio · 2026-05-17 · 100 min · Russian
- **Patch at publication:** 7.41c. Hero builds, talents and neutral items are left out.
- **Type:** live-format guide. The coach, with a 15K peak, plays games at about 2,300 MMR on a new account without voice communication and comments on every decision.
- **Subject:** position 2 on two mobile, rune-dependent heroes
- **Source:** auto-generated captions only. The first two games are read in detail and the remainder sampled.

## Core idea

At low MMR the game is "easy mode": enemies don't smoke, don't build well and don't tempo. The climb is:
1. play a small pool of similar heroes you know well;
2. win the mid by last hitting and runes;
3. push the wave before doing anything else;
4. farm fast and don't die, letting the enemy come to you and make the mistake.

Games at this rank are long, so there is no hurry. The coach's net worth was about 12K at 20 minutes and 21K at 30.

## Findings

### F1 · 2:06–3:07, 52:53–53:23 · draft · a small, similar hero pool

**Claim.** To climb you need signature heroes: three to five, with at least 100 games each, because understanding the game and understanding a hero are different things. Keep the pool similar, such as mobile mids who play around runes, so switching heroes doesn't confuse you.

**Signal — partly observable.** The hero comes from `participants`. The player's history on it is in `progress` when requested.

### F2 · 3:37–5:12, 54:59–56:01 · lane · harass and last hit together

**Claim.** In mid, hit the enemy hero when you can and the creeps when you can't. Use your nuke to take creeps and harass in one cast. When there's nothing to do, block your next wave toward your tower. Manage aggro so you rarely fight from low ground up into theirs.

**Signal — partly observable.** Last hits and denies by minute from `series`, and hero damage in the lane phase from `phases`. Blocks and aggro are not recorded.

### F3 · 5:12–5:44, 1:05:28 · lane · heal only when you need all of it, but never go without

**Claim.** Use regen when it will be fully used, not at slightly low health. But never be without resources: without them you can't fight, and a team that can't fight loses.

**Signal — observable.** Regen purchases and their times from `items.purchases`.

### F4 · 9:29–10:30, 11:37–12:43 · lane · push the mid wave before anything else

**Claim.** Never leave the mid unpushed, in any situation. An unpushed wave hides where you go and costs the tower. The enemy mid who ganked without pushing his wave was deep in the minus even after a kill: his wave was lost and his tower hit. If you can't hold mid, ask a support to stand there.

**Signal — partly observable.** Tower losses from `objectives`. Time away from the lane is derivable from the position row. Waves are not recorded.

### F5 · 9:29–10:00, 12:43–14:46 · early game · runes decide the next two minutes

**Claim.** Whoever takes the power rune dominates the next two minutes. Always watch the rune timer and play around it. Taking the enemy's mid tower gives you rune control for the rest of the game. The coach notes that nearly all his kills in one game came with a rune.

**Signal — partly observable.** The mid tower's time from `objectives`. Rune pickups are collected but not published.

### F6 · 13:14–13:46 · any stage · the minimap produces the thoughts

**Claim.** "The minimap gives you ideas; without it there are none." In the coach's replay reviews, the lower the rating, the less often the player looks at the minimap.

**Signal — not observable.** Camera and attention are not recorded.

### F7 · 16:20–16:51, 1:01:13 · farm · farming speed is a base skill

**Claim.** No game is won without farming speed: seeing the farm on the map and taking it quickly, with your hands on autopilot while your head thinks about the game.

**Signal — observable.** Last hits and net worth by minute from `series`, against peers in `baseline.comparisons`.

### F8 · 19:28–19:58 · any stage · the teleport is the most important button

**Claim.** Don't spend the teleport on small tricks such as refilling the bottle. It matters more than any big ultimate, because without it you miss the fights.

**Signal — partly observable.** Teleport purchases are in `items.purchases`. Uses are collected but not published.

### F9 · 24:11–25:16 · any stage · die as rarely as possible, and learn from each death

**Claim.** If you want to win, die as rarely as possible. Professionals die against professionals, not at low ranks, and low-ranked enemies are easy mode. After each death, work out right away why it happened. Deaths have to be eliminated.

**Signal — observable.** Every death with its context in `deathAnalysis.contexts`, and deaths against peers in `baseline.comparisons`.

### F10 · 25:16–27:21, 1:11:53, 1:30:59 · midgame · play second at low ranks

**Claim.** At low ranks, let the enemy come to push your towers and kill them there. Players here can't take tempo, so games go long: farm and don't die. When a five-on-five comes at your tower, you win it. "If you don't make the mistake, the enemy will."

**Signal — partly observable.** Towers and their times from `objectives`, and deaths from `deathAnalysis.contexts`. Fights at your towers are derivable from OpenDota's teamfights.

### F11 · 34:56–35:57 · mentality · the game depends only on you

**Claim.** If you die twice, don't expect a weaker team to win for you. Split-pushing is for games where you are weaker and must avoid the enemy.

**Signal — partly observable.** Deaths and `teamEconomy`.

## Coaching method

- Live commentary of every thought during a real game, without voice contact with teammates.
- A short stat check after each game: last hits, damage, net worth at 20 and 30 minutes.

## Exercises the coach gave

- After each death, name the reason before moving on.
- Build a pool of three to five similar heroes and reach 100 games on each.

## Not taken

- Hero builds, talents, neutral items and the item debates (7.41c).
- Remarks on teammates, reports and pauses, and the paid-content promotion.

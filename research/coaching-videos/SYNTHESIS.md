# Coaching video synthesis

A summary across the 50 notes in this folder: 393 findings from 26 coaching reviews and 24 guides. The notes remain the source; this page groups them.

**Two rules still apply.**
- A claim here is a coach's opinion, not a verified fact.
- Nothing here is a current-patch fact.

The counts come from `node research/coaching-videos/tools/stats.mjs`. The grouping into principles is ours; each principle lists the notes that make the point.

## What our artifact can check today

Each finding carries one signal category (see the [README](README.md#note-format)).

| Signal | Findings | Share |
| --- | --- | --- |
| observable: the artifact already contains it | 69 | 18% |
| partly observable: part of the claim is in the data | 162 | 41% |
| derivable: the sources contain it, the artifact does not expose it | 85 | 22% |
| not observable: match data cannot show it | 77 | 20% |

Fewer than one coach claim in five can be checked from the artifact in full. The strongest parts of the artifact are:
- per-minute farm and its peer comparison: `series` and `baseline.comparisons`;
- deaths: `deathAnalysis`;
- purchases with item texts: `items.purchases` and `mechanics.items`;
- buildings and Roshan: `objectives`;
- the team's economy: `teamEconomy`.

The weakest are what happens between deaths: where the player was, what he farmed, where he teleported, whether he was in the fights.

Findings by stage: lane 126, midgame 114, any stage 28, early game 21, teamfight 16, late game 13, early midgame 11, mentality 11. The other stages have fewer than ten each.

## Principles most coaches repeat

Ordered by the number of notes that make the point.

| # | Principle | Notes | What the artifact shows today |
| --- | --- | --- | --- |
| 1 | Manage the wave: creep aggro, lane equilibrium, pulls and blocks with a purpose. | 04, 05, 06, 08, 10, 11, 16, 19, 20, 26, 28, 32, 34, 37, 38, 39, 40, 43, 47, 50 | Last hits and denies by minute only. Wave position, pulls and blocks are not recorded. |
| 2 | The lane is a fight over resources. Trade 2v1, base aggression on the creep count and on power-spike windows. The matchup doesn't decide the lane in advance. | 06, 08, 10, 12, 13, 18, 22, 24, 25, 32, 34, 37, 38, 39, 44, 45, 49 | Hero damage in the lane phase (`phases`), lane deaths, `lane.selectedSideOutcome`. Health, mana and creep counts are not recorded. |
| 3 | Die less, and know which deaths break a game: late deaths from overextending, chasing or walking blind under towers. | 02, 07, 10, 14, 18, 22, 23, 24, 28, 29, 32, 34, 46, 47, 48, 49 | Strong: each death's context in `deathAnalysis.contexts`. |
| 4 | Lanes before camps. The jungle is filler; farm the enemy's space rather than your team's. | 02, 03, 05, 11, 14, 20, 23, 24, 26, 28, 31, 34, 44, 45, 47, 49 | Nothing direct. The lane or neutral split of last hits is collected but not published. |
| 5 | Every fight needs a reason: resources, a power spike, a key cooldown, several reasons at once. | 03, 04, 05, 06, 12, 13, 14, 18, 29, 33, 35, 38, 44, 45 | Deaths inside fights. Cooldowns and resources are not recorded. |
| 6 | Buy for the problem in this game; survivability before damage; explain every item. | 02, 03, 05, 13, 16, 19, 22, 25, 26, 30, 32, 44, 49, 50 | `items.purchases`, `mechanics.items`, `draft`. The fit is a review judgement. |
| 7 | Push the wave before leaving the lane, ganking or taking a rune. Pushed waves are information. | 02, 03, 05, 06, 12, 15, 22, 24, 27, 34, 44, 46, 48 | Towers lost in `objectives`. Waves are not recorded. |
| 8 | Teleport discipline: always carry one, don't waste it, don't teleport away from a fight that is forming. | 05, 06, 07, 09, 11, 14, 19, 22, 25, 26, 29, 46, 47 | Purchases, and the last teleport before each death. Other teleports are collected but not published. |
| 9 | Read the map. Fear only enemies who can reach you, and remember that the place you were last seen is where the search starts. | 05, 07, 10, 13, 14, 15, 24, 29, 30, 31, 39, 46, 49 | Enemies near the player at each death. Positions at other times are not published. |
| 10 | Carry your own resources: regen, wards, sentries. | 04, 07, 08, 11, 18, 26, 31, 37, 39, 46, 47, 49 | Observable: `items.purchases` and `wards`. |
| 11 | Plan ahead: pre-game questions, both win conditions after the lane, timings 30–40 seconds in advance. | 01, 09, 16, 18, 19, 23, 25, 33, 44, 46, 47, 50 | Draft and objectives. Intent is not recorded. |
| 12 | Late game: don't siege on impatience or on the Aegis alone. Pick someone off first, don't go in one by one, keep a buyback. | 04, 06, 14, 20, 24, 26, 34, 35, 45, 47, 48, 49 | `objectives`, late deaths, `buybacks`, `teamEconomy`. |
| 13 | Vision with a purpose, for supports and cores alike. | 11, 15, 16, 19, 20, 26, 28, 31, 34, 39, 47, 50 | The player's own wards. Enemy wards are not recorded. |
| 14 | Last hits and net worth are the floor. Kills don't replace farm. | 12, 22, 23, 25, 26, 28, 31, 42, 46, 47, 49 | Strong: `series` and `baseline.comparisons`. |
| 15 | After a fight, convert it into an objective or go back to farming. Don't overchase. | 02, 04, 08, 14, 26, 29, 34, 44, 45 | Objectives after a fight. Fights appear only around the player's deaths. |
| 16 | A lead is map control, not the kill count. Take the enemy's safe-lane tower first, and defend your own. | 13, 14, 15, 27, 31, 33, 35, 44, 45 | `objectives` and `teamEconomy`. |
| 17 | Look at yourself, don't argue in chat, don't decide the game in advance. | 04, 10, 19, 20, 23, 32, 36, 46, 47 | Not observable. |

## Where coaches disagree

- **Farm first or fight early as a carry.**
  - Farm-first side (notes 23, 31, 46, 47): at low ranks, farm, don't die, and let the enemy come to you.
  - Aggressive side (note 45): the coach wins by fighting in lane and farming the enemy's side early. Notes 22 and 44 lean the same way: "it is a PvP game", and "the worst thing is farming defensively".
  - Note 33 adds that playing second wins low ranks but doesn't make a player strong.
  - Shared ground: push lanes, farm the enemy's space when strong, join fights next to you. The review should therefore judge the player's own farm, deaths and map share, and not prescribe a style.
- **The creep block.** Note 34 calls it not worth the attention; notes 20 and 26 treat a good first block as important.
- **Where to farm after losing a tower.** Note 28 recommends a safe loop behind your tower; notes 34 and 45 push deep into the enemy's side. The notes differ in situation: behind versus ahead.
- **Roshan for a slow-hitting carry.** Note 31 records two top players disagreeing: take it on timing, or smoke and hunt instead.

## What the reviews choose as the main problem

Captions carry no picture, so no match ID could be read from the reviews, and the skill could not be run on the same games. The table is a qualitative reference: which problem a coach picks first at which rank.

| Note | Player | Coach's main problem |
| --- | --- | --- |
| 02 | carry, ~2.2K | lane items that don't fit the hero's lane problem; no wave setup after a lane kill |
| 03 | mid, ~2.2K | holding back without naming the reason; items not serving the plan |
| 05 | offlane, ~2.7K | walking away from waves he could farm; passive when weak, all-in when strong |
| 08 | mid, ~2K | a simple running plan: regen, a health lead, a tower, farm, reset |
| 12 | mid, ~2K | not farming as hard as the lane allows; fights without resources or objective; no conversion |
| 20 | carry, ~2.4K | weak lane micro, farming the mid's camps, no impact on the map |
| 26 | mid, low | weak last hitting, idle time, no wards, no teleport |
| 04 | support, ~3.9K | no reset after won fights; no idea of the next fight |
| 16 | support, ~4K | items duplicating the team; save spells used on himself |
| 15 | mid, ~4.8K | passive after a won lane: own jungle, no wards, the team's spike unused |
| 13 | carry, ~5K | lane control abandoned; played as a second aggressor, not as the late carry |
| 25 | offlane, ~5K | missed lane trades, then two minutes at a time without farm |
| 22 | mid, ~5K lobby | "PvE mode": no harass, no rune pushes, random kills |
| 06 | mid, ~5.1K | fights without pushed lanes before and after them |
| 01 | carry, ~5.5K | picking against the enemy offlaner instead of fitting his own support |
| 23 | carry, ~5.5K | late first item from weak farm, and every later death one level short |
| 14 | three players, 1K–7K | farming patterns and no conversion, at every rank |
| 18 | mid, a coach himself | random actions: no lane plan, fights without purpose |
| 10 | support, ~9.7K | tools that don't fit his hero; deaths while holding a spell |
| 07 | offlane, ~10K | lane damage taken, a teleport back after every death, the tower's teleport circle |
| 19 | support, high MMR (self-review) | wrong camp blocked, reactive vision |
| 09 | supports, high MMR (self-review) | small lane errors; servicing the losing lane instead of pressing the winning one |
| 24 | carry, high MMR | a positive review: over-caution, an escape spent out of fear |
| 11 | support, beginner | habits, not analysis: resources, teleport, vision, the team |
| 17, 21 | — | negative references: coaches who missed planted mistakes or taught a fixed script |

Three observations:
- Below about 3K, coaches pick basics: farming the waves the lane allows, resources, items that fit the lane.
- Between about 4K and 5.5K, they pick conversion and structure: what happens after a won lane or fight, where to farm, lane control.
- Deaths are rarely the main problem in their own right. They appear as symptoms of something upstream: chain deaths from overchasing, deaths holding a spell, a teleport spent after each death.

For our reviews:
- The problems coaches pick most often, such as "walks away from waves", "farms his own jungle" or "leaves the lane unpushed", need the position rows and the lane or neutral split of last hits. The artifact doesn't publish either yet.
- With today's data, the closest evidence is per-minute farm against peers, objectives and team economy.

## How good reviews are run

Patterns from the notes' coaching-method sections:

- **Start from the player's own question or self-description, then test it against the replay.** Notes 01, 02, 03, 04, 05, 12, 13, 14, 15, 22, 24.
- **Ask for the reason before correcting.** Let the player name the missing reason himself. Notes 02, 05, 12, 13, 18, 26, 37.
- **Name what is good and must not change.** Notes 02, 03, 11, 15, 24, 25.
- **Separate the game-losing mistake from mere inefficiency, and the player's mistakes from the team's.** Notes 09, 24, 25.
- **Trace a late problem back to its first cause.** Note 15 moves "we got pressed after 20 minutes" back to minute seven. Note 23 chains a late first item to every later death.
- **Keep the scope narrow.** One limiting factor, two or three focuses, one exercise, a follow-up. Notes 01, 02, 10, 23.
- **Use numbers from the replay as the argument.** Armour, charges, net worth at a minute, the direct opponent's stats. Notes 12, 14, 18, 22, 28, 46, 47.

Anti-patterns:
- Missing mistakes the data shows plainly, such as a skill build into attributes (note 17).
- A fixed script with no link to the match (note 21).
- Commands without reasons (note 21).
- Blaming teammates or the draft (notes 17, 21).
- "More information" instead of a concrete, explained instruction (note 20).

Note 26 names a limit of every replay review, ours included: a replay carries no communication.

Our review contract already requires:
- one main finding, chosen for evidence and actionability;
- its key episode or measurement;
- one exercise tied to that finding;
- no inferred intent, cause or alternative outcome the data doesn't show.

Four patterns above are not yet explicit in it:
- naming what to keep;
- separating the game-losing mistake from inefficiency;
- tracing a late problem to its first cause;
- keeping the finding on what the player controls, not on teammates.

These are candidates to test against the benchmark, not decisions.

## Exercise library

Exercises the coaches gave, grouped by what they train.

| Trains | Exercise | Notes |
| --- | --- | --- |
| last hitting | last-hit tutorial before ranked games; last-hit practice in a custom lobby; one hit on your own creep after each last hit | 05, 25, 26, 32, 42, 43 |
| blocking and aggro | block practice in a lobby that spawns waves; test drawing, harassing and shedding aggro with the range shown | 26, 40 |
| lane trading | 2v2 lane drill with a partner; the loop trade, stay in position, sustain, trade again; the lane order trade, last hit, deny, take XP | 37, 39 |
| lane questions | where does the wave meet, is a 2v1 available, who has more creeps, did a spike just change the balance; what does the enemy need to kill me alone; can I walk up to this wave without dying | 05, 28, 38 |
| wave discipline | push the wave before every rune or gank; after every fight, check the waves first; clear an extra wave before and after each fight | 03, 06, 15, 22, 34 |
| farming | farming challenge against harassing bots without killing them; plan each minute's route; keep moves between targets under 10 seconds; step toward the next camp between hits | 23, 28, 47 |
| decisions | say the exact reason when holding back; stack the reasons before committing; name each fight's objective; one fight indicator at a time; the readiness check; the four rotation questions | 03, 13, 18, 29, 49 |
| planning | a pre-game plan of whom to suffocate and with what; the enemy's win condition and your timing after the lane; plan each timing 30–40 seconds ahead | 18, 44, 50 |
| teleport | after a death, decide where the teleport will be needed before using it; walk back with a fast hero | 07, 09 |
| deaths | after each death, name the reason; after a game with repeated deaths, study each one; count deaths while holding a spell | 10, 32, 46 |
| supports | carry a sentry, an observer and a smoke; drill stack and pull timings; deward with two sentries, likely spot first | 11, 16, 19 |
| hero pool | a personal hero grid by your own support's type; three to five similar heroes with 100 games each | 01, 46 |
| setup | quick-cast on key press; show spell and experience ranges; control groups; camera hotkeys to lanes and runes | 25, 26, 32, 41 |

The numbers inside some exercises are one coach's targets, not norms: 350 last hits by 20 minutes, health above 80%, 100 games per hero. Our review template forbids presenting an unsourced performance number as a target. In a review, such an exercise can be used only as a practice plan without the number, or with a number backed by a peer comparison.

## Data the artifact would need

The same count, by the unpublished data the signals name (from `tools/stats.mjs`). A signal can name several.

| Data | Notes whose signals need it | Where it is today |
| --- | --- | --- |
| all ten players' positions over time | 38 | fetched from STRATZ; published only around each death |
| teleports | 23 | collected for the player; only the last one before a death is published |
| lane versus neutral last hits, with locations | 22 | collected for the player (`events.cs`); not published |
| teamfight intervals and participation | 20 | OpenDota teamfights; used only for each death's context |
| rune pickups | 12 | collected for the player; not published |
| kill times | 10 | collected for the player; not published |
| other players' per-minute data, such as the enemy carry's farm | 8 | in the OpenDota response; used only for the team totals in `teamEconomy` |
| stacks | 5 | OpenDota `camps_stacked`; not extracted |

Some things no match source will show: wave position and creep aggro, health, mana and cooldowns at a moment, enemy vision, and communication. They sit behind most of the not-observable findings, and wave management is the most repeated principle. A review should say so rather than guess.

These rows are candidates, not a plan. The agreed direction is to take roadmap items from failures on the benchmark of real matches. A row belongs on the roadmap when a benchmark review misses a problem that this data would have shown.

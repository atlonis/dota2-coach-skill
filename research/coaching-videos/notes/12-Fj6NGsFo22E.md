# 12 · Daxak reviews a 2K MMR mid

- **Video:** [КАК ВЫБРАТЬСЯ С 2К ПТС | РАЗБОР ОТ ДАХАКА](https://youtu.be/Fj6NGsFo22E) · Daxak Dota · 2026-06-08 · 23 min · Russian
- **Patch at publication:** 7.41d. Item names are illustrations only.
- **Type:** coaching review of a submitted replay
- **Subject:** position 2 at about 2,000 MMR, an adult player who has climbed from 700 in a year. He says previous coaches told him what to do but not why.
- **Source:** auto-generated captions only

## Main finding

The coach's verdict: the player understands the logic, but his execution is "a C at best". He does not farm as hard as the lane allows. He jumps into fights without the resources for them. He fights with no timing and no objective. And he farms without ever converting his items into a win: having a big item and still not taking Roshan and ending the game.

## Findings

### F1 · 1:01–1:40 · method · up to the mid brackets, last hitting carries you

**Claim.** Up to roughly the Titan bracket (the coach's figure), you climb on almost any hero by last hitting properly and building sensible items. Learning Dota is like learning anything: first copy, then copy with adjustments, and only then create.

**Signal — observable.** Last hits by minute against the baseline come from `baseline.comparisons`, and `phases` gives the aggregates.

### F2 · 3:41–5:45 · lane · harass on the first wave, stand clear of the creeps

**Claim.** As an aggressive mid, hit the enemy mid, especially on the first wave, and then hold lane control. Stand outside the creep wave against a hero with an area nuke, so he can't hit you and the creeps with one spell while you hit both.

**Signal — partly observable.** Hero damage by minute from `series` and last hits from `series`. Standing position relative to the wave is not recorded.

### F3 · 5:45–6:46 · lane · compare resources before jumping

**Claim.** Before going in, compare mana, health, armour and regen charges. The opponent had twice the mana and more regen, so the jump was a mistake. With creeps still between you, don't do it.

**Signal — not observable.** Mana, armour and consumable charges at the moment are not recorded. The resulting death appears in `deathAnalysis.contexts`.

### F4 · 6:46–10:22 · lane · don't leave an unpushed lane in a public game

**Claim.** Don't leave the lane for a rune or timing without pushing the wave first. In a public game, go nowhere until you have pushed the lane or finished an item. The lane's task is to farm as hard as possible:

- push for every rune timing;
- have a ward for the night;
- ideally stack for yourself.

Push the first wave fast for level 2. Pushing fast lets you pull the wave or go to the jungle when the enemy leaves for a rune.

**Signal — derivable.** Last hits and rune pickups (`events.runes`) against the player's position leaving mid, from the position row. Not computed yet.

### F5 · 10:22–11:24 · lane · take the contested rune from strength

**Claim.** From a position of strength, take the contested rune: the one the enemy mid is likely going for. Taking the other one is hoping for luck.

**Signal — observable.** Rune pickups from `events.runes`. Where the enemy mid was is derivable from his position row.

### F6 · 11:24–13:30 · early midgame · a gank must be fast and have an objective

**Claim.** Any move is good if it is fast. It needs a reason: a strong rune, an enemy without resources, a siege wave. Otherwise play around your team's key hero. Otherwise it wastes time on a hero who can simply leave, and ends with two cores splitting one lane's creeps.

**Signal — derivable.** Teleports in `events.repositions` to a lane where a kill follows, set against the time spent and the player's last hits afterwards.

### F7 · 13:29–16:36 · midgame · the strongest hero must create pressure

**Claim.** The strongest hero on the map should press where the enemy is weakest, not farm the jungle before the lanes. Buying items without converting them is farming for its own sake. After a key item, take Roshan, buy a gem and end the game.

**Signal — partly observable.** Net worth ranks in `teamEconomy` and `participants`, item timings in `items.purchases`, and Roshan and towers in `objectives`. Whether the item was "converted" into an objective is a review judgement based on those rows.

### F8 · 18:10–20:45 · draft · pick heroes that are hard to shut down

**Claim.** A player who is not a professional should pick heroes that are hard to shut down. A fragile hero against divers forces you to last pick, or to play perfectly. Stun-heavy heroes often pay for it with a weak lane or weak farming.

**Signal — observable.** `draft` and `lane.opponents`. Whether a hero is fragile is hero knowledge.

### F9 · 21:16–22:18 · midgame · fights at low MMR are random

**Claim.** Fights at this rating happen in random places, under enemy vision, with no timing, for random targets. Everyone runs there and flips a coin. Fight under your own vision, at your ability or item timing, or at an enemy objective where you are guaranteed stronger. Otherwise the player who farmed the wave gains more, even when your side wins the fight.

**Signal — derivable.** The location of `events.teamfights` against warded areas (`wards`) and the player's own item and level timings.

## Coaching method

- He asked the player to describe his first 15 minutes and his usual build before watching.
- He asked "why did you do this?" at each decision and answered his own rhetorical questions with numbers from the replay: mana, armour, charges.
- He answered the player's side questions about matchups at length.

## Exercises the coach gave

- Before each jump, compare your mana, health and regen to the opponent's.
- Don't leave the lane in a public game until the wave is pushed or an item is finished.

## Not taken

Hero-specific builds, the matchup verdicts and an aside about deny mechanics (7.41d).

# 05 · BSJ coaches a 2,700 MMR offlaner

- **Video:** [BSJ Dota 2 Coaching 2700, Offlane](https://youtu.be/ZvTiXVLS-yE) · Dota Dojo · 2026-06-02 · 71 min · English
- **Patch at publication:** 7.41c. Hero details illustrate principles only.
- **Type:** paid coaching session. One full offlane game, then the first minutes of a ranged mid game.
- **Subject:** position 3, a Night Stalker player at about 2,700 MMR who also plays position 4. He named no specific goal beyond general improvement.
- **Source:** auto-generated captions only

## Main finding

The coach's headline was that the player walks away from creep waves he is strong enough to farm. His one takeaway: be far stickier to creep waves for the first 25–30 minutes.

Around that, the coach saw a two-mode pattern:

- **Weak:** overly passive, retreating well inside his real limits.
- **Strong:** overly committed, diving with no condition for backing off.

On ranged heroes, lane last hitting suffers from poor creep aggro.

## Findings

### F1 · 4:08–6:40 · lane · creeps and experience come before wave position

**Claim.** Keeping the wave in front of your tower is right, but it exists to get more gold and experience than the opponent. Never walk out of experience range or leave a creep to die just to fix the wave's position. Fix the position only when there are no creeps to take, or when staying means dying.

**Signal — partly observable.** Last hits, denies and XP by minute come from `series`. Walking away from creeps is derivable from the position row and `events.cs`.

### F2 · 11:20–15:30 · lane · strength in lane means you can farm the wave

**Claim.** The number one sign of lane strength is that you can farm the wave without dying. Check it for every wave: "can I walk up to this creep wave?" If you feel strong but cannot farm, go and be strong somewhere else: rotate. The danger depends on the enemy carry's mobility and damage, and on the support's burst.

**Signal — derivable.** The player's distance to his lane wave over time, from the position row. Wave positions are not recorded, but waves follow a fixed schedule. Not computed yet.

### F3 · 17:35–22:13 · midgame · a hero who can't jungle walks to the next lane

**Claim.** For a hero who clears camps slowly, the midgame question is simply "is there a lane I can farm? Walk to it", not which camp to stack. Every missed wave costs such a hero far more than it costs an offlaner who farms camps fast. At full health, even while weak, you can still stand on a free wave.

**Signal — derivable.** The player's lane last hits against neutral last hits in `events.cs`, by phase. Waves left unfarmed are derivable from positions and the wave schedule.

### F4 · 22:46–27:00, 34:40–36:15 · any stage · calibrate aggression on a scale

**Claim.** The coach framed the player's play on a one-to-ten scale:

- **Weak:** he plays at a 1, "if I show on a lane I die". He should be at about 2.5: farm a wave when nobody is near.
- **Strong:** he plays at a 10, "whatever they have, they die". He should be at about 8.5: force reactions, but with explicit conditions for backing off.

Being too passive locks a player in his bracket, because he never tests his limits.

**Signal — partly observable.** Kills and deaths per phase come from `phases`, and teamfights appear only around the player's deaths in `deathAnalysis.contexts`. How aggressive a position was is derivable from positions relative to enemies.

### F5 · 28:00–36:15 · midgame · dive to force a reaction, not to all-in

**Claim.** Without proof that you have the numbers, a dive onto enemies at a tower is a bluff meant to force a reaction: teleports, or a key defensive spell. Ask before going in what reaction you are trying to force. When it comes, back off; you have won that exchange. Turn around the moment the enemy's key defensive spell lands.

**Signal — derivable.** Dives are derivable from positions near enemy towers and the player's deaths there. Enemy teleports appear as jumps in their position rows. Spell casts by enemies are not in the artifact.

### F6 · 39:50–42:30 · midgame · when your hero's power window is closed, don't teleport to fights

**Claim.** For a hero with a strong and a weak phase, such as day and night, never teleport to the team's fight during the weak phase. The coach's guess is that the player would gain MMR over 500 games by never doing it. In the weak phase the only question is which waves you can farm without dying. A fight elsewhere simply means those waves are free.

**Signal — derivable.** Teleports in `events.repositions` against the game clock, where the day and night cycle is fixed, and against OpenDota's teamfights. Not computed yet.

### F7 · 42:59–46:40 · midgame · items that secure the impact you actually have

**Claim.** When a hero's fight impact is one-dimensional, as in blink in and kill one target in three seconds, most of the time, buy what secures that plan: immunity first, then lockdown against escape items. Alternatives that are good in a vacuum do not serve such a hero.

**Signal — partly observable.** `items.purchases` against kills per phase in `phases`. Kill times are collected in `events.kills` but not published. The fit is a review judgement.

### F8 · 49:20–53:00 · teamfight · initiate, don't counter-initiate, with an initiation hero

**Claim.** Heroes with mobility and vision win when they jump the enemy and feed when the enemy jumps their team. Such a hero cannot turn a fight in which the team was caught. Know whether your hero initiates or counter-initiates, and play fights accordingly.

**Signal — partly observable.** `deathAnalysis.contexts` has `firstAlliedDeathInFight` and the nearby enemies. Who started a fight is not recorded.

### F9 · 55:10–56:43 · midgame · pushed waves give information

**Claim.** Pushing waves while enemies are dead forces them to show on the map, and that information gives better fights. Without it the team blinks blind into all five enemies.

**Signal — not observable.** No vision data. The player's wave pushing is derivable from positions and last hits.

### F10 · 1:00:18–1:06:40 · lane · creep aggro on ranged heroes

**Claim.** Ranged heroes take heavy creep damage. Walking forward and drawing the wave onto yourself is a mistake. After using a nuke, draw the creeps toward yourself and away from the enemy so they don't deny them. Five to ten minutes of last-hit practice a day is the best improvement per minute. Either commit to a block of about 15 ranged-hero games or stay on melee heroes.

**Signal — partly observable.** Last hits and denies at 5:00 and 10:00 from `series` and the baseline. Creep aggro is not observable.

## Coaching method

- He opened by asking what the player likes about his favourite hero, then used that self-description, "strong at night, weak by day", to frame the whole session.
- He asked for the player's reason at each odd decision ("why can't you farm this creep wave?") and accepted it when it was right 90% of the time, only pointing out the exception.
- He discouraged self-blame for teammates' deaths and replaced it with "at what point could you have turned around?"
- He admitted his own old weakness on ranged heroes as a pro.

## Exercises the coach gave

- For every wave, ask "can I walk up to it without dying?" If yes, don't walk away from it.
- Before every aggressive play, name the reaction you want to force and your condition for backing off.
- Practise last hitting 5–10 minutes a day, or play a block of about 15 ranged-hero games.

## Not taken

Hero-specific item and shard details, and the coach's remark that one item is a "bait" item (7.41c).

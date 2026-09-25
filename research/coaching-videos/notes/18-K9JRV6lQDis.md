# 18 · Daxak coaches another coach on two mid games

- **Video:** [И ЭТО ВАШ ТРЕНЕР? ДАХАК УЧИТ ИГРАТЬ 15К ТРЕНЕРА ПО ДОТЕ](https://youtu.be/K9JRV6lQDis) · Daxak Dota · 2026-01-17 · 69 min · Russian
- **Patch at publication:** 7.40b. Hero facets and item choices are left out.
- **Type:** coaching session. The student is himself a paid Dota coach who wants to teach better, playing mid in two games he considered good.
- **Subject:** position 2. The first game is on a controlling mid hero, the second on a farming mid hero he thought he played "almost perfectly".
- **Source:** auto-generated captions only

## Main finding

In both games the coach found that the student's actions were "random". He knew the theory and said most of it himself, but didn't follow it:

- he threw away a favourable start at the bounty runes;
- he had no plan for lane control;
- he fought without resources or purpose, and missed the timings his own team created.

The "ideal" second game looked good only because the opponents made mistakes. The coach's closing message: make a plan, even an imperfect one, follow it, and judge it by the result.

## Findings

### F1 · 1:04–4:40 · pre-game · questions to ask before the lane

**Claim.** Ask yourself before the game:
- why this hero;
- how hard this game is for him;
- what the game plan is.

Weigh which enemy heroes can come back from a bad start and which cannot. Which enemy is easiest and fastest to kill? To break a lane you can't reach directly, attack another hero to draw teleports and resources, then strike where they came from, by smoke, gate or teleport.

**Signal — partly observable.** `draft` and `lane.opponents`. Comeback potential is hero knowledge.

### F2 · 7:15–11:21 · pre-game · with the better lanes, don't gamble at the runes

**Claim.** When your lanes are favourable, don't reinvent the wheel. A fight at the bounty runes for first blood cost the runes, the creep blocks and the lane wards. It also sent a teammate to lane by teleport with no mana: an easy target. Secure the runes, the wards and the blocks, and the lanes win the game for you.

**Signal — partly observable.** Kills and deaths per phase come from `phases`, and the player's deaths from `deathAnalysis.contexts`. Rune pickups and teleports are collected in `events.runes` and `events.repositions` but not published. Creep blocks are not observable.

### F3 · 11:21–16:30 · lane · lane control for a mid

**Claim.** When you are stronger in the matchup, harass constantly and take lane control. Right after last hitting, step in for one or two hits: either the enemy gives ground or walks into your tower. Don't wait and hope. Too many enemy creeps is also bad: you then can't harass, deny and last hit all at once.

**Signal — partly observable.** Last hits and denies by minute come from `series`, and hero damage for the lane phase from `phases`. Creep counts and positions are not recorded.

### F4 · 16:30–18:37 · lane · stack the reasons before committing

**Claim.** An opportunity was strong because several factors lined up at once:
- the lotus timing;
- a dead enemy hero who couldn't rotate;
- the enemy mid's teleport on cooldown, so no one could save him quickly.

Check this list before committing.

**Signal — partly observable.** The player's deaths are in `deathAnalysis.contexts`. His teleports are collected, but the artifact publishes only the last one before a death. Other heroes' teleports appear as jumps in their position rows. Lotus timing is fixed.

### F5 · 18:37–20:42 · lane · dive only on timing

**Claim.** Before a dive, check whether the enemy supports can intervene: are they dead, out of resources, or away? A dive right after the enemy's teleport comes back off cooldown is a bad dive.

**Signal — derivable.** Enemy support positions from the position rows at the time of the player's deaths near enemy towers.

### F6 · 22:14–26:22 · lane · when the enemy mid leaves, punish at once

**Claim.** When the enemy mid goes for a rune or a camp, react immediately. Pull your wave into a camp and take it, or push. Pros do this constantly. Hovering visibly at the side of the lane shows your intention and invites a teleport onto you.

**Signal — derivable.** The enemy mid's position, from his position row, against the player's last hits. Not computed yet.

### F7 · 28:28–31:05 · lane · bring a salve rather than walk to base

**Claim.** A salve has no 90-second cooldown and is cheaper than the lost time. Walking to base at low health cost waves and stacks.

**Signal — partly observable.** Regen purchases from `items.purchases`; trips to base are derivable from the position row.

### F8 · 32:07–35:47 · early midgame · every fight needs a reason

**Claim.**
- With the key spell and your burst item used up, leave: two deaths for nothing followed.
- Contest a rune only with vision and at least equal strength, not when three weaker heroes face three stronger ones.
- When everything is bad, farm one area and play around your strongest teammate.

**Signal — partly observable.** Deaths are observable. Rune pickups and teamfights are in the sources but not in the artifact. The resources behind a decision are not observable.

### F9 · 40:57–45:40 · midgame · be next to the action when your cooldown returns

**Claim.** When your key item or ultimate comes back, be near the place you want to act, with a teleport ready. A strong window for killing the enemy offlaner with his ultimate on cooldown was missed because nobody called it. Smoke only for objectives: runes, towers, zones.

**Signal — partly observable.** Deaths are observable, and teamfights only around them. Cooldowns are not observable.

### F10 · 46:12–1:09:00 · second game · an "ideal" game can hide mistakes

**Claim.** In the second game the student thought his play was nearly perfect. The coach found:

- an even creep block when he should have out-blocked or not blocked;
- a stack that cost a wave;
- a ward placed for nothing;
- a missed early kill on the one enemy hero who cannot come back.

The lead came from an opponent who gave up his own lane.

**Signal — partly observable.** Stacks and blocks are not observable. Kills per phase, wards and last hits are.

## Coaching method

- He asks the questions a coach should ask, and explains why: he wants to hear what is in the student's head, so the student finds the answer himself next time.
- He answers his own "why" with concrete numbers, such as attack damage and armour.
- He calls out a "perfect" self-assessment by showing that the opponent's errors created the result.

## Exercises the coach gave

- Before the game, write a plan: which enemy to suffocate before his power level, with which wards and teammates. Follow it.
- At every opportunity, stack up the reasons (timing, dead heroes, cooldowns) before committing.

## Not taken

Hero facet and item choices, and the discussion of talents at levels 10 and 25 (7.40b).

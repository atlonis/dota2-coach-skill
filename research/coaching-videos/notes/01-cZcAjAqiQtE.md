# 01 · BSJ coaches a 5,500 MMR carry on drafting

- **Video:** [BSJ Dota 2 Coaching 5500, Carry](https://youtu.be/cZcAjAqiQtE) · Dota Dojo · 2026-06-02 · 69 min · English
- **Patch at publication:** 7.41c. Hero lists below are examples of archetypes, not current picks.
- **Type:** follow-up paid coaching session, theory only; no replay is watched
- **Subject:** position 1 at about 5,500 MMR. His previous session was about farming around teammates; his goal now was choosing his hero in the draft.
- **Source:** auto-generated captions only

## Main finding

The coach's diagnosis: the player picks his carry against the enemy offlaner first. By the coach's account this is the most common carry mistake. The first thing to fit is the player's own support, because that pairing sets how bad the lane can get in the worst case.

## Findings

### F1 · 7:20–9:30 · draft · priority order for a carry pick

**Claim.** Consider, in order:
1. your own support;
2. the enemy offlaner;
3. the enemy support;
4. the enemy lane pair as a whole, which only a last pick can see.

Countering the offlaner while clashing with your own support is like counter-picking the enemy's last pick with a team that has no stuns. Fitting the support limits the worst case to roughly a 35:65 or 40:60 lane.

**Signal — observable.** The picks are in `draft` and the lane partners in `participants` and `lane`. Pick order is not in the artifact. Whether a pair fits is a review judgement from hero knowledge.

### F2 · 9:30–30:30 · draft · support archetypes decide which carries fit

**Claim.** The coach sorts lane supports into six types:
1. ranged lane dominators with slows;
2. ranged kill supports;
3. push-and-pull supports who let you farm quietly;
4. melee supports who want the enemy to walk into them;
5. melee kill supports;
6. roamers who leave you alone, the "you're on your own" type.

Each carry fits some types. A hero who needs protection wants a support who draws attention in front of him, not one who stays behind or leaves. Against type 6, pick a carry who wins lane alone or can farm the jungle from level three. Some supports keep every carry pick safe; with others the outcome swings widely.

**Signal — partly observable.** Hero identities come from `draft` and `participants`, and their abilities from `mechanics.heroes`. The archetype itself is hero knowledge, not recorded data.

### F3 · 30:55–48:40 · draft · offlaner archetypes and how to answer them

**Claim.** The coach sorts enemy offlaners into:
- melee and ranged lane-shovers who trade efficiently;
- melee and ranged killers;
- summon heroes.

Against killers, pick a hero who does not die to their combination. Against shovers, pick a hero who does not mind the lane sitting at his tower, one with sustain and a way to survive a dive, or a hero whose passive punishes an enemy standing on the wave. Against summon heroes, counter the lane hard and look after the tower, whatever the rest of the carry matchup.

**Signal — partly observable.** `lane.opponents` gives the actual lane opponents and `lane.selectedSideOutcome` the result. The archetype is hero knowledge.

### F4 · 55:30–56:05 · lane to midgame · occupying your lane by minute 10

**Claim.** In the current meta, the carry who still holds his lane at minute 10 while the other carry has been pushed out wins most games. The coach puts it at about nine in ten in his own games, as an anecdote.

**Signal — derivable.** The player's position at 10:00 from the position rows, together with last hits at 10:00 and the lane opponents. Not computed yet.

### F5 · 49:10–1:07:00 · preparation · a personal hero grid

**Claim.** The coach has the player build a hero grid with these columns:
- the current meta, keeping only heroes already comfortable plus one to learn;
- comfort picks;
- carries to pick when your support will leave you;
- heroes that counter summon offlaners, and one column for a specific problem hero;
- lane dominators.

Lane dominators are poor if they lose the lane, so pick them late, with more information. Grow the grid from real games, not from theory.

**Signal — not observable.** This is preparation outside the match; `draft` shows only the result.

## Coaching method

- He opened by checking how the previous session's lesson went in practice.
- He restated the player's limiting factor in one sentence before starting.
- He built categories together with the player and asked him to place heroes.
- He kept the scope narrow: expand the grid only after trying it in games.
- The homework is an updated hero grid, with the changes and the reasons, sent in place of the next replay.

## Exercises the coach gave

- Before picking, look at your own support first. Limit your options by that support's type, then choose from the matching column of your grid.
- After games, add the columns you were missing and note which picks worked.

## Not taken

Specific hero placements, matchup verdicts and meta comments (7.41c).

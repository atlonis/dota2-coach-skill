# 28 · PainDota: why a carry with kills still has low farm

- **Video:** [Why You Struggle With Low Farm But Pros Don't](https://youtu.be/f6IGul_HEms) · PainDota · 2026-09-24 · 28 min · English
- **Patch at publication:** 7.41f. Hero, item and neutral-token details are left out; the coach's gold figures are rough.
- **Type:** excerpt from a paid coaching session: replay review with the student, then a farming demonstration
- **Subject:** position 1 Luna. The student climbed from Crusader to Legend over a few weeks with this coach.
- **Source:** auto-generated captions only

## Main finding

The student gets kills in lane but still has low net worth: two kills and 4K at 10 minutes, where the coach expects at least 5K. The causes are small and constant.

- **In lane:** he mismanaged creep aggro, so the wave pushed away. He didn't pull to bring it back, gave up waves out of fear of heroes who could not kill him, and never unblocked the big camp.
- **Later:** his farming pattern wasted time. He walked long distances between camps, went to waves near enemy towers where a teleport could catch him, and stood still between hits.

The coach estimates he used 60–70% of each minute: 230 last hits at 22 minutes where a better player has 300.

## Findings

### F1 · 0:00–0:31 · lane · kills don't guarantee net worth

**Claim.** Two lane kills with 4K net worth at 10 minutes means the lane was still played badly. The coach's target for this lane is at least 5K.

**Signal — observable.** `series.netWorth` at 10 minutes, kills in the lane phase from `phases`, and `baseline.comparisons`.

### F2 · 1:35–4:42 · lane · manage creep aggro to keep the wave

**Claim.** Creeps attack what is in front of them. Standing in front of your own ranged creep draws hits and takes the ranged creep out of deny range; then the lane pushes. Draw the enemy melee creeps onto your ranged creep instead. Whether you can walk forward to do it depends on the enemy: heroes without a level-1 stun can't punish you.

**Signal — not observable.** Creep aggro and wave position are not recorded.

### F3 · 5:46–7:50 · lane · when the wave pushes in, pull it yourself

**Claim.** Once your wave pushes toward the enemy, pull the small camp yourself: you farm the camp and the wave comes back. Don't count on the support. Going off to stack a far camp instead loses waves. With a carry who farms camps, ask the support not to block the small camp, or to unblock it later.

**Signal — derivable.** Neutral last hits in the lane phase from the `isNeutral` flag in `events.cs`, collected but not published. Pulls themselves are not recorded.

### F4 · 8:20–12:02 · lane · ask what the enemy needs to kill you

**Claim.** Missed waves cost XP even more than gold. The player's level 6 came late, and the enemy offlaner, sharing XP with a support, kept up with him. Before giving up a wave, ask: can this hero kill me alone, and with what? If not, take the wave. If you must give it up, pull.

**Signal — partly observable.** XP by minute from `series.xp`, and the matchup from `lane.opponents`. Fear is not observable.

### F5 · 12:37–13:08 · midgame · a blocked camp costs a whole game

**Claim.** 110 last hits by about 15 minutes: the big camp was farmed once, because it was blocked and nobody unblocked it. With the missed waves, the player lost about 40 last hits and 2K net worth.

**Signal — observable.** Last hits and net worth by minute from `series`. Camp blocks are not recorded.

### F6 · 13:08–16:14 · midgame · after a push, where is your next farm?

**Claim.** Plan the next farm before pushing a wave. Next to an enemy tower, all nearby farm is exposed to teleports, and a high-MMR enemy who sees a lone carry there teleports in. Go deep only when all five enemies show on the other side of the map.

**Signal — derivable.** Deaths near enemy towers with enemies arriving by teleport, from `deathAnalysis.contexts` and the enemies' position rows. Not computed yet.

### F7 · 16:14–18:15 · midgame · a safe farming loop beats risky waves

**Claim.** When the enemy takes your side lane, stay behind your tower:
- push out the wave that reaches you;
- farm the five safe camps;
- repeat.

The coach estimates over 800 gold per minute this way, and more with illusions pushing another lane. Only your item timings matter; chasing every side lane wastes time.

**Signal — partly observable.** Gold and net worth by minute from `series`. Camps and waves are not recorded.

### F8 · 18:45–21:22 · farm · gold, time and safety

**Claim.**
- Judge every farm target by its gold, the time to reach it, and its safety.
- No move between farm targets should take longer than 10 seconds.
- Two safe camps can be worth as much as a wave next to the enemy tower, and they respawn.

The student did the opposite of what the situation asked: he avoided waves early, when the enemies were weak, and walked to exposed waves later, when they were strong.

**Signal — derivable.** Time and distance between successive last hits, from `events.cs` and the position row. Not computed yet.

### F9 · 21:22–26:31 · farm · move toward the next camp while killing this one

**Claim.** Between hits, step toward the next camp. Pull adjacent camps together. Know the whole minute's route before starting it. Three wasted seconds per camp is 15 seconds a minute. Farming on the side of the camp away from the enemy also dodges ganks.

**Signal — partly observable.** Last hits at 22 minutes from `series.lh` and `baseline.comparisons`. Movement is derivable from the position row.

### F10 · 27:05–28:07 · midgame · take your jungle back with your own sentries

**Claim.** When the enemy wards your jungle after your tower falls, buy your own sentry and observer. Farm the camps they can't see, or while they show elsewhere.

**Signal — observable.** The player's sentries and observers in `wards`.

## Coaching method

- He asked the question he wants the student to ask himself: what does this hero need to kill you alone?
- He did the gold arithmetic on screen: waves, camps and time per minute.
- He showed his own farming route in a practice lobby to demonstrate movement between hits.

## Exercises the coach gave

- Before each minute, plan the farming route to its end.
- Keep every move between farm targets under 10 seconds.
- Step toward the next camp between hits, and pull adjacent camps together.

## Not taken

- Hero, item and neutral-token details, and the coach's gold figures, which are rough estimates (7.41f).
- The coaching advertisement.

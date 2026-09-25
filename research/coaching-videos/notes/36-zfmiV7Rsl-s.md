# 36 · str: five questions boosters answer differently

- **Video:** [ПОЧЕМУ БУСТЕРЫ АПАЮТ ММР, А ТЫ НЕТ? Дота 2 гайд.](https://youtu.be/zfmiV7Rsl-s) · str · 2024-10-22 · 11 min · Russian
- **Patch at publication:** 7.37d. Hero and build specifics, and the promotion of paid guides, are left out.
- **Type:** mindset guide from a player who climbed from about 3,000 to 7,400
- **Source:** auto-generated captions only

## Core idea

Players split into those who blame the team and those who blame themselves. The author frames climbing as five questions a player should answer honestly:
1. How do you handle conflicts?
2. Why do you press "find match"?
3. Which heroes do you pick, and why?
4. Do you use role queue?
5. Do you review replays?

## Findings

### F1 · 0:31–2:33 · mentality · never enter a conflict

**Claim.** In a role dispute, the simple right action is to settle it by random roll and not create a conflict. Every loss you could have avoided costs rating. In game, never reply to blame, not even one word:
- each second of arguing lowers your will to win and takes your eyes off the map;
- the whole team hears it, and someone may give up.

Save your voice for useful calls: enemies in smoke, Roshan, push.

**Signal — not observable.** No chat data.

### F2 · 2:33–4:36 · mentality · press "find match" to win

**Claim.** There are three reasons to queue:
- to have fun;
- to improve and win;
- inertia.

Inertia is no reason at all; if the game stopped being fun, you don't really want to play. Playing for fun is fine, but then losses shouldn't upset you. To climb, queue only to win, and expect weak teammates. A loss is then just experience to learn from.

**Signal — not observable.** Motivation is outside the match.

### F3 · 4:36–6:40 · draft · pick heroes with personal impact, and repeat proven builds

**Claim.**
- To climb, prefer heroes who can move the game alone: fast farmers who can make solo pick-offs.
- Heroes who can play several roles protect you from role disputes.
- Repeat proven builds rather than improvising. The first three or four items are like a chess opening: the best-known sequence, played every game.

**Signal — partly observable.** The hero and position come from `participants` and `draft`, and the build from `items.purchases`. Consistency across games is visible in `progress` when history is requested.

### F4 · 7:11–8:42 · mentality · use role queue, solo

**Claim.** Role queue saves time, removes most role conflicts, and puts you on your main role in most games. Only there can you exclude party players from your matches. The author calls classic ranked a way into more conflicts and party boosters.

**Signal — not observable.** Queue settings are not in the artifact.

### F5 · 8:42–10:16 · review · watch replays for two reasons only

**Claim.** Like any sport, part of your time must go to training outside the match. Watch replays for two reasons:
- a top player on a hero you want to learn;
- your own mistakes: item timings, deaths, teamfights.

Without this, progress still comes, but a thousand times slower.

**Signal — observable.** This is what our review does. Item timings come from `items.purchases`, deaths from `deathAnalysis.contexts`, and peer comparisons from `baseline.comparisons`. Teamfight behaviour is only partly published, around deaths.

## Exercises the coach gave

- Decide before queueing why you are pressing "find match".
- After games, review your own item timings, deaths and teamfights.

## Not taken

- The author's hero, build and paid-guide promotion.
- Comments on the matchmaking system and high-rank draft modes.

# 21 · A cheap coach teaches a "newcomer": a negative reference

- **Video:** [ТРЕНЕР РАЗОБРАЛ ОШИБКИ НОВИЧКА DOTA 2](https://youtu.be/WAcK_bDcb3o) · Folzygenius · 2026-01-29 · 17 min · Russian
- **Patch at publication:** 7.40c.
- **Type:** part of a prank series. A regular player poses as a newcomer, hires a cheap coach (300 roubles a session) and follows every instruction. The opening clips from real professional coaches are a contrast.
- **Source:** auto-generated captions only

## Why this video is in the set

This is a second example of what a bad coach does, alongside note 17. It is useful as a list of review behaviours to avoid.

## Findings

### F1 · 0:00–0:35 · lane · the one valid point: the ranged creep

**Claim.** The contrast clip from a professional coach: the ranged creep is worth about two melee creeps. Many players don't use a spell on it or contest it, and lose it for free.

**Signal — partly observable.** Last hits and denies from `series`. Individual ranged-creep kills are not distinguished in the artifact.

### F2 · 2:11–4:45 · method · a script instead of a plan

**Claim.** The cheap coach reduces carry play to a fixed script:
1. starting items;
2. the bounty rune;
3. the lane until minute 10;
4. the jungle;
5. kill enemies if they come close.

He asks for last pick so he can choose the hero, and forbids ranked play without him. Nothing in it depends on the matchup, the heroes or the game state.

**Signal — not observable.** This is coaching behaviour, not match data.

### F3 · 6:49–13:40 · method · blame and vague commands

**Claim.** During the game the coach gives:
- commands without reasons ("thorns, thorns, first skill");
- skill points into the wrong ability;
- blame for the support and the team ("just a useless support", "the team runs around four against one").

He ends with "you get stronger every game" after two losses.

**Signal — partly observable.** A review that blames teammates while the player's own skill build is wrong would be caught by reading `skillBuild`.

## Lessons for our reviews

- A fixed script with no link to the match is not a review.
- Instructions must come with the reason, so the player can apply them without the coach.
- Blaming teammates gives the player nothing fixable. Our review contract already requires a finding the player controls.

## Not taken

Everything else: the item and skill instructions are wrong or hero specific.

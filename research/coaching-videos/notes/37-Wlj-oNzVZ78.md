# 37 · BalloonDota: a 2v2 lane drill with students

- **Video:** [Why You SUCK at LANING (And How to Fix It) - Dota 2](https://youtu.be/Wlj-oNzVZ78) · BalloonDota · 2026-09-25 · 15 min · English
- **Patch at publication:** 7.41f. Hero-specific items and spells are left out.
- **Type:** coaching drill. Students play a 2v2 lane while the coach comments; then the coach plays the same lane to show the difference.
- **Source:** auto-generated captions only

## Core idea

Lanes are lost to the same basic mistakes, not to mechanics or matchups:
- not trading when a trade is on;
- over-trading when losing;
- letting big waves build up;
- running out of regen;
- one lane partner fighting while the other stays out.

The coach's summary: trade, don't be out of position, sustain, repeat. Levels 1–3 depend on the situation more than on the matchup.

## Findings

### F1 · 2:05–2:38 · lane · trade when you can, pull when you can't

**Claim.** Pull only when no trade is available or the lane is unwinnable. Leaving a live trade to go pull is a mistake. When you trade, spend your spells: supports hoard too much mana while at full mana.

**Signal — partly observable.** Hero damage in the lane phase from `phases`. Pulls and mana are not recorded.

### F2 · 1:34–2:05 · lane · bring your own sustain

**Claim.** Health and mana that are always low decide the lane. Use a tango when you trade, and buy your own regen in public games rather than waiting for a partner's.

**Signal — observable.** Regen purchases and times from `items.purchases`, including the pre-game window.

### F3 · 2:38–8:22 · lane · manage the wave size

**Claim.** Don't let a big wave build up against you. Tanking a wave of five or six creeps while trading loses every trade. Match the creep count: when there is nothing else to do, kill two or three creeps actively. An idle support should help deny and clear the big wave. When a strong lane wants to push fast, kill the wave with your spells.

**Signal — not observable.** Wave size and creep aggro are not recorded.

### F4 · 4:12, 6:48, 8:22–8:54 · lane · don't over-commit, and don't play only for kills

**Claim.** Commit only when you can finish the kill; otherwise the spell is wasted. When you know you're losing the trades, stop forcing them and let the wave play out. When enemies aren't out of position, help with the wave and wait for them to step forward.

**Signal — partly observable.** Lane deaths from `deathAnalysis.contexts`, and kills in the lane phase from `phases`.

### F5 · 8:54–13:35 · lane · two players, one lane

**Claim.** There is no "my partner is too aggressive, so I leave him". If your partner trades, you trade. A core who helps its support in trades, and stays close enough that any enemy dive must go through both, makes the enemy unable to punish either. Drag the wave with you when you help, so you don't lose last hits.

**Signal — partly observable.** Allies near the player at each death come from `deathAnalysis.contexts`. The partner's position during the lane is derivable from its position row.

### F6 · 13:35–14:36 · lane · don't decide the lane in advance

**Claim.** Don't walk into a lane thinking "I can't beat this matchup, so I play passive". What decides the lane is how you react to each situation, and even a hard lane is won by punishing every 2v1.

**Signal — partly observable.** `lane.opponents` and `lane.selectedSideOutcome` show the matchup and the result, not the attitude.

## Coaching method

- A controlled drill: two pairs of students in one lane, so the coach can compare trading, sustain and wave management side by side.
- He asked the students and the audience to name the mistakes before giving his own list.
- He replayed the same lane himself, narrating each decision, to show "nothing forced".

## Exercises the coach gave

- 2v2 lane practice with a partner, focused on trading together and keeping the wave small.
- In lane, repeat the loop: trade, stay in position, sustain, trade again.

## Not taken

- Hero-specific starting items, spells and the students' hero choices.
- The coaching promotion.

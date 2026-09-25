# 27 · Support Heaven: keep a lead by taking space, not chasing kills

- **Video:** [Why You Keep Throwing Winning Games](https://youtu.be/jc3GfKioTGw) · Support Heaven · 2026-09-16 · 12 min · English
- **Patch at publication:** 7.41f. Hero examples are left out.
- **Type:** macro guide for supports, built on a moment from a coaching session and one of the coach's own games
- **Source:** auto-generated captions only

## Core idea

Being ahead means controlling more of the map, not just having more gold. A team that took the enemy's first towers usually wins later, even at even gold. Convert an early lead into map control:
- push waves;
- take towers, the enemy's safe-lane tower first;
- farm the enemy's space.

A losing team can come back only by killing you, so chasing kills with a hero that isn't built for it hands them the way back.

## Findings

### F1 · 1:04–2:39 · midgame · a lead is map control

**Claim.** Map control gives more camps, easier waves, aggressive vision and more pick-offs, because the enemy has less safe space. When ahead, don't farm and hope the lead holds: shrink the enemy's map. Their safe-lane tower matters most; it drives their carry out or makes him inefficient. Defending your own safe-lane tower matters just as much.

**Signal — observable.** Tower times and sides come from `objectives`, and team gold, XP and net worth differences from `teamEconomy`.

### F2 · 3:41–5:16 · midgame · play what your hero does best

**Claim.** The student, on an area-control support, went to kill the struggling enemy carry. That was the worst option: her hero is no kill hero. The right play was to farm the carry's remaining camps. The enemy then needs two or three heroes to stop one support, while the rest of the team takes the map. A kill-oriented support should look for the kill instead. Ask what your hero offers: safe lane pushing, kill threat or vision.

**Signal — partly observable.** The draft and hero abilities come from `draft` and `mechanics.heroes`. The player's deaths come from `deathAnalysis.contexts`. Whether a hero is built for kills is hero knowledge.

### F3 · 7:21–8:56 · midgame · push first, then use the kill threat

**Claim.** With the enemy's towers down and yours standing, you already farm more than they do; you don't need kills to grow the lead. Push the waves first. The enemies must then split to answer them, which creates the pick-offs. With your lanes pushed in, they are likely grouped or ready to teleport.

**Signal — partly observable.** `teamEconomy` shows the lead growing or shrinking. Wave state is not recorded.

### F4 · 8:56–10:29 · midgame · pushed lanes tell you whether to fight

**Claim.** If the enemies answer pushed waves, they show on the map: either easy targets or proof that they are split. If waves hit their towers and nobody shows, they are grouped and planning something: back off, or group up too. If they use teleports to fix waves, that may be the window for Roshan or the Tormentor.

**Signal — partly observable.** Roshan and Tormentor kills come from `objectives`. Enemy positions are derivable from their position rows. Waves and vision are not recorded.

### F5 · 8:56–9:26 · midgame · what a forced kill really costs

**Claim.** The student's forced kill attempt cost two deaths. The enemy carry got gold and XP, and she got her lane back, because nobody was pushing it. It looks like bad luck, but for map pressure it is a disaster.

**Signal — partly observable.** The deaths and their context come from `deathAnalysis.contexts`, and the swing from `teamEconomy`. Wave state is not recorded.

## Exercises the coach gave

Before acting when ahead, ask: what does my hero offer — safe lane pushing, kill threat or vision? Play around that.

## Not taken

- The hero examples and the lineups from the coach's own game.
- Advertisements for coaching.

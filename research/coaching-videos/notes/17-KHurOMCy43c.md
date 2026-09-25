# 17 · A paid coach misses planted mistakes: a negative reference

- **Video:** [НАНЯЛ 13К ТРЕНЕРА ЧТОБЫ ОН РАЗОБРАЛ САМУЮ ГЛУПУЮ ИГРУ](https://youtu.be/KHurOMCy43c) · Daxak Dota · 2026-03-18 · 24 min · Russian
- **Patch at publication:** 7.40c.
- **Type:** a prank review. A high-MMR streamer, in disguise, hired a "13K" coach from a marketplace to review a deliberately bad 5K game on carry Faceless Void. In that game the streamer had been controlled by a beginner.
- **Source:** auto-generated captions only; an advertisement in the middle is ignored

## Why this video is in the set

This review is an example of what a bad review looks like, which our own reviews must avoid. The streamer had planted obvious mistakes. His asides on the recording reveal at least two:

- the stat-toggling boots were never switched once;
- ability points apparently went into attributes rather than into abilities.

The coach noticed neither. He rated the game six or seven out of ten, blamed the draft and the teammates, and closed with generic advice: mirror the map, play in a party, raise your behaviour score.

## What the coach got right and what he missed

### F1 · 5:42–8:22 · lane · advice given: hold at your tower when dived

**Claim.** When dived early in a hard lane, stay under your own tower: it attacks the divers and gives regen and armour. Buy magic-damage regen against a magic lane, and level the defensive spell first in a lane you cannot win.

**Signal — partly observable.** Lane deaths from `deathAnalysis.contexts`, purchases from `items.purchases`, and the skill order from `skillBuild`.

### F2 · 4:07–5:10, 13:28–14:01 · draft · advice given: check whether your team can damage inside your ultimate

**Claim.** A hero whose ultimate traps enemies needs teammates who can deal damage inside it. Without that, the pick is weak.

**Signal — observable.** `draft` and `mechanics.heroes`. The synergy is hero knowledge.

### F3 · 19:15–22:20 · midgame · advice given: when far behind, mirror the map

**Claim.** When 20K behind, fight only on your own high ground as five. Otherwise farm the side of the map opposite the enemy. Comebacks come from baiting with a smoked team behind the bait.

**Signal — partly observable.** `teamEconomy`, and the player's position against where enemies are, which is derivable.

### F4 · whole video · review · what a review must not miss

**Claim.** The planted mistakes were concrete and checkable. Levelling attributes instead of abilities shows directly in the skill build. Blaming teammates and the draft gives the player nothing to change.

**Signal — observable.** `skillBuild` shows the upgrade order, including non-ability upgrades. Toggling an item's stat is not observable.

## Lessons for our reviews

- Check the recorded mechanics first, before judging macro: the skill build and item use. They are cheap to read and hard to excuse.
- A review that ends in "your team was bad, play in a party" has not found a fixable problem.

## Not taken

The coach's hero-specific build advice, the advertisement, and the behaviour-score remarks.

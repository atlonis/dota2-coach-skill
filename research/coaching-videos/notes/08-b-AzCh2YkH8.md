# 08 · BalloonDota live-coaches a 2K MMR mid

- **Video:** [I turned a 2k MMR player into SMURF](https://youtu.be/b-AzCh2YkH8) · BalloonDota · 2026-09-14 · 13 min · English
- **Patch at publication:** 7.41e.
- **Type:** live coaching, with the coach giving instructions while the student plays; edited highlights with a course advert at the start
- **Subject:** a 2K MMR mid player; the hero is not named in the captions
- **Source:** auto-generated captions only. Short imperative commands, so the reasons are often left unsaid.

## Core idea

The coach turns his own game plan into a running sequence of simple instructions:

1. Carry enough regen.
2. Build a health lead in lane before standing close.
3. Turn the lead into a tower.
4. Farm for several minutes, joining only big fights.
5. After each fight, go straight back to farming and runes.

## Findings

### F1 · 1:00–1:35 · lane · carry regen and use it

**Claim.** Queue regeneration with the starting items and buy more on the way. Consumables for mana are the mid's main source of mana early.

**Signal — observable.** Regen purchases from `items.purchases`, including the pre-game window.

### F2 · 1:00–2:40 · lane · kill creeps actively to control aggro

**Claim.** When the wave has four creeps, actively kill one or two instead of waiting only for last hits, so you take less creep damage. At level one you can draw creep aggro freely; from level three to five, draw it less.

**Signal — partly observable.** Last hits by minute from `series`. Creep aggro is not observable.

### F3 · 2:40–4:09 · lane · build a health lead before standing close

**Claim.** Keep your distance and hit from afar until there is a clear health difference. With the lead, stand closer, harass more and push. When the enemy mid is low, push the wave and pressure the tower. Hit the enemy ranged creep whenever you are allowed to.

**Signal — partly observable.** Kills and deaths per phase come from `phases`, and lane deaths from `deathAnalysis.contexts`. The tower's destruction time is in `objectives`. Health difference is not observable.

### F4 · 4:09–5:11 · lane to midgame · turn a won lane into a tower, then farm

**Claim.** Once the lane is won, keep the pressure until the tower falls. Then farm waves, camps and runes for about ten minutes and join only a big fight.

**Signal — partly observable.** Tower destruction from `objectives` and last hits per phase from `phases`. Rune pickups are collected in `events.runes` but not published.

### F5 · 5:11–11:58 · midgame · after a fight, reset to farm

**Claim.** After each fight, teleport back, take the runes and farm again instead of lingering. In fights:

- don't go in first;
- push slowly, committing only partly;
- fly in, cast, fly out, hit;
- break the enemy's key summoned defence first;
- finish the heroes who are about to die.

**Signal — derivable.** From the end of each teamfight, time to the player's next last hits or rune pickup. Being first into a fight is partly visible through `firstAlliedDeathInFight`.

### F6 · 8:18–10:25 · midgame · play to your advantages

**Claim.** With the Aegis, immunity and the team nearby, the student hesitated. The coach's repeated instruction was not to be scared: in that state a landed stun is a kill.

**Signal — partly observable.** Aegis pickups from `objectives` and immunity purchases from `items.purchases`. Hesitation itself is not observable.

## Coaching method

- Live, imperative, one instruction at a time ("hit creeps actively", "build that difference, then stand strong"), repeated until done.
- The coach corrects in the moment and praises good execution immediately.

## Exercises the coach gave

- In lane: kill one or two creeps of every full wave, and only stand close once you have a health lead.

## Not taken

The course advertisement, hero-specific spell calls, and the item order (7.41e).

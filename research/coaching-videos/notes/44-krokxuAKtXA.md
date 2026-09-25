# 44 · Support Heaven: a 10K support narrates his own game

- **Video:** [How a High MMR Support Thinks | Dota 2](https://youtu.be/krokxuAKtXA) · Support Heaven · 2026-09-22 · 33 min · English
- **Patch at publication:** 7.41f. Hero, talent and item specifics are left out.
- **Type:** self-review. The coach narrates his own replay of an even game that his team won through map control in the midgame.
- **Subject:** position 4 Hoodwink at about 10K MMR
- **Source:** auto-generated captions only

## Core idea

After an even or lost lane, a support should ask two questions:
- How does the enemy win?
- When is our timing?

Then play the map, not the kill count. Expand into the enemy's space and force rotations. Push lanes out. Put each hero where its strength lies. The coach's team trailed in kills for 25 minutes but farmed more of the map, and won once the enemy was shut in its base.

## Findings

### F1 · 3:10–3:41 · lane · a trade in the enemy's creeps is a bad trade

**Claim.** The coach traded where the enemy had three or four creeps and his side had none, and called it his own mistake. Base aggression on the creep count.

**Signal — not observable.** Creep counts are not recorded.

### F2 · 3:41–5:13, 7:50–8:54 · lane · give the core its levels, and don't force moves before your spike

**Claim.** Leave a struggling core some solo XP, and stack a camp for him instead. Before your level-6 spike, don't force moves around the map with a hero who can't set up kills yet. Help the core level, and take the rune when your mid needs it more than theirs.

**Signal — partly observable.** The player's XP by minute from `series.xp`. The core's levels are in the sources but not published. Stacks are not recorded.

### F3 · 5:13–7:19 · lane · after a lost lane, find both win conditions

**Claim.** Once the lane is lost, ask how the enemy wins: here, their late-game carry. Then ask when your team is stronger: here, between about 15 and 30 minutes. If your heroes can deal with their carry at that timing, don't over-invest in shutting him down now. If they can't, push his tower now.

**Signal — partly observable.** `draft`, `lane.selectedSideOutcome` and `teamEconomy` show the situation. The win condition is a review judgement.

### F4 · 9:27–10:28 · early game · defend your safe-lane first tower

**Claim.** Defending your safe-lane first tower matters as much as taking the enemy's: it keeps space for your carry. A failed kill attempt that saves the tower is fine.

**Signal — observable.** Tower times and sides from `objectives`.

### F5 · 11:01–12:37 · early game · react, stay unseen, then turn the kill into a tower

**Claim.** The coach died greedily showing on a wave. Next time, seeing a move on another lane, he joined it unseen and got the kill. Right after it, he went to pressure a tower in the other lane while the enemies were dead.

**Signal — partly observable.** Deaths come from `deathAnalysis.contexts` and towers from `objectives`. Kill times are collected but not published.

### F6 · 13:07–14:40 · midgame · fight where your farming carry can join

**Claim.** Fights near your farming carry let him join for free kills at no risk, while the enemy carry farms elsewhere. Winning fights matters more than where they happen.

**Signal — derivable.** The carry's position at each fight, from the position rows and OpenDota's teamfights. Not computed yet.

### F7 · 15:11–18:47 · midgame · expand the map and force rotations

**Claim.**
- Play in aggressive areas even if you can't always farm there.
- Showing yourself there forces enemies to rotate.
- Even a lost fight is fine when the enemy is then far from objectives and had to bring three or four heroes.
- Place each hero where its strength is: the pusher on the side-lane tower, the killer next to the core who fights.

Playing in an area where you know the enemies wait is just feeding. It does tell you they have vision there.

**Signal — partly observable.** Deaths and their positions come from `deathAnalysis.contexts`, and towers from `objectives`. Rotations are derivable from the position rows.

### F8 · 19:18–20:22 · items · a support with strong cores doesn't need to be the hero

**Claim.** With three strong cores, the support doesn't need damage items. Buy for survival and mana instead. With cores who fall off late or only stun, itemise differently.

**Signal — observable.** `items.purchases`, `draft` and `mechanics.items`. The fit is a review judgement.

### F9 · 20:52–22:24 · midgame · control two lanes, not three

**Claim.** Trying to control three lanes without a very large lead just feeds kills. Push two lanes and let the third come in.

**Signal — partly observable.** `teamEconomy` shows the lead. Wave control is not recorded.

### F10 · 22:24–25:32 · midgame · map share beats kill count

**Claim.** Behind 14 to 20 in kills, the team was ahead because it farmed a larger share of the map. More gold means more items and, later, won fights. A support farming a wave while the team's key ultimate is on cooldown isn't griefing; regroup when it's back. The coach calls about 50 last hits at 20 minutes a good benchmark for this support.

**Signal — partly observable.** Gold, XP and net worth differences come from `teamEconomy`, and the player's last hits from `series.lh`. Team kills are in the sources but not published.

### F11 · 27:36–30:39 · late game · push waves out and hold the triangle

**Claim.** The most important and easiest late-game rule is to push waves out. It also gives information: if your creeps hit their third tower and nobody defends, the enemies aren't in base. Control the jungle between two of your lanes. Enemies shut in their base don't farm, so there is no hurry to end.

**Signal — partly observable.** Buildings and their times come from `objectives`, and the net worth trend from `teamEconomy`. Waves are not recorded.

### F12 · 31:41–32:43 · any stage · the worst thing is farming defensively

**Claim.** Farming only your own safe areas loses games, even when you don't notice it. Farm offensively whenever your team is strong enough.

**Signal — derivable.** Where the player's last hits happened, from the collected `events.cs` and the map halves. Not computed yet.

## Coaching method

- He picked an even game on purpose: stomps teach little.
- He narrated his reasoning at each decision and called out his own mistakes: a bad trade in creeps, a greedy death on a wave, walking into a warded area.
- He tied item choices to what his cores already provide.

## Exercises the coach gave

- After the lane, name the enemy's win condition and your team's timing.
- Base lane aggression on the creep count.

## Not taken

- Hero-specific spells, items and the claim about the strongest support in the patch (7.41f).

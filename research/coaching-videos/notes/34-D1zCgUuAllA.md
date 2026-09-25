# 34 · A 13K coach on mid lane and mid macro

- **Video:** [Все МАКРО ФИШКИ для МИДА от 13к тренера | МИД UEIO](https://youtu.be/D1zCgUuAllA) · Ueio · 2025-02-01 · 35 min · Russian
- **Patch at publication:** 7.37e. Hero matchups, damage numbers and ward coordinates are left out.
- **Type:** guide with demonstrations in a practice lobby
- **Subject:** position 2
- **Source:** auto-generated captions only; the demonstrations lose their map context

## Core idea

The mid is the second core and the space maker, not the one who must win every game alone. A player who needs to win alone should switch to carry.

The mid's plan:
1. Win the lane through creep control and trades on your high ground.
2. Gank quickly while strong, with the lane pushed first.
3. Around minute 14, when enemies group, switch to farming and to pushing lanes deep. Farm the enemy's space, not your team's.
4. Late: keep the enemy split by pushed waves, pick them off, and don't feed; the comeback mechanics punish throws.

## Findings

### F1 · 2:07–3:09 · pre-game · go to the bounty rune

**Claim.** In most games, go to the bounty rune: protect teammates from first blood, or maybe take it. The creep block isn't worth the attention many give it. Block only in even or hard matchups, and you can still block from near your tower after the rune.

**Signal — partly observable.** Early deaths come from `deathAnalysis.contexts` and first blood from `objectives`. Rune pickups are collected but not published. Blocks are not observable.

### F2 · 3:09–7:55 · lane · keep drawing the creeps

**Claim.** High-MMR mids have many last hits because they constantly draw creep aggro:
- when your creep is at half health, draw the enemy creeps so the wave shifts toward you;
- when the enemy goes for a last hit, draw aggro to spoil it;
- when your creeps die first, lead the enemy wave up onto your high ground.

On your high ground the enemy misses uphill and your tower's aura adds armour.

**Signal — partly observable.** Last hits and denies by minute come from `series`. Creep aggro and wave position are not recorded.

### F3 · 4:46–11:04 · lane · trade on your high ground, and hit first

**Claim.** Hold your high ground and clear the wave fast at the same time. Hit the enemy mid whenever you can: even without a kill he loses creeps. Trade harder when your bottle or a water rune is about to come. In a hard matchup, strike first, when the enemy goes for a creep away from his wave, and step back while your spells are on cooldown.

**Signal — partly observable.** Hero damage in the lane phase comes from `phases`. Trades and cooldowns are not recorded.

### F4 · 11:35–14:12 · lane · a simple observer, placed at once

**Claim.** Place the observer immediately and stand near it, so you can deny it if someone comes for it. Refresh it just before the next rune. Elaborate hidden spots are pointless: any ward that sees the enemy high ground can be found.

**Signal — observable.** Placement times from `wards`.

### F5 · 14:12–17:20 · early game · push before you gank, and come back at once

**Claim.**
- Clear the wave with spells before leaving. Leaving an unpushed wave shows the enemy you are coming, costs farm and XP, and can cost your tower.
- Take the bounty rune on the way.
- After a successful gank, teleport straight back to the wave.

Students who chase a second kill for two or three minutes lose their tower and have about 3,800 net worth at 10 minutes.

**Signal — partly observable.** Net worth at 10 minutes from `series.netWorth`, and tower losses from `objectives`. Time away from the lane is derivable from the position row; teleports are collected but not published.

### F6 · 19:27–22:04 · early game · gank while strong, then farm

**Claim.**
- Once you can no longer kill the enemy mid, leave; standing in a won lane for its own sake is a waste.
- Gank for about the first 10 minutes, while boots and early items make you strong.
- By about minute 14, when the enemies group up, buy a farming item and farm a lot.

**Signal — partly observable.** Kills and last hits by phase come from `phases`. Ganks are derivable from the position row and the collected kill events.

### F7 · 22:36–23:38 · midgame · in pubs, play second

**Claim.** Supports who coordinate with you are one game in a million. Running around the map with them usually just loses farm and feeds. Farm to your key item, then teleport onto enemies who dive your towers.

**Signal — partly observable.** Item times come from `items.purchases`. Teleports into fights are collected but not published.

### F8 · 23:38–29:28 · midgame · push lanes deep; the jungle is for the low-skilled

**Claim.** Pushing lanes deep, even cutting waves behind the enemy tower, does three things:
- you don't take your team's farm;
- you get rich;
- you create space, because the enemies must answer the waves. They usually come in twos or threes, which lets you kill the stragglers or push another lane.

The sense of when enemies will teleport onto you takes 50–100 games to develop, and you will die at first.

**Signal — derivable.** Lane versus neutral last hits and their locations, from the collected `events.cs`. Deaths deep in enemy territory come from `deathAnalysis.contexts`.

### F9 · 29:28–32:36 · midgame · after a won fight, push every lane; stay within reach

**Claim.** After wiping the enemy, don't walk down mid into the second tower. Push all three lanes for gold, take Roshan, and replace the enemy's wards with yours. Keep within reach of your team: if they are bottom, you are at most mid. Push out a wave before joining them.

**Signal — partly observable.** Objectives after a fight come from `objectives`. The player's distance from allies is derivable from the position rows.

### F10 · 32:36–35:08 · late game · don't feed; the last fight decides

**Claim.** Comeback mechanics are strong: whoever wins the last fight wins the game. Don't give a losing enemy kills. Siege the high ground only with a big lead and the Aegis, after smoking around the map to pick off enemies outside their base. Value the advantage you earned and don't hand it back.

**Signal — partly observable.** `teamEconomy` shows the lead and its swings, and `objectives` the Aegis and buildings. Late deaths come from `deathAnalysis.contexts`.

## Exercises the coach gave

- Before leaving the lane to gank, clear the wave; after the gank, teleport back at once.
- Practise pushing waves deep and reading when the enemy will teleport onto you, expecting to die at first.

## Not taken

- Hero matchups, damage numbers and the hero-specific lane plan (7.37e).
- Ward and teleport coordinates, which lose their meaning without the picture.
- The advertisement for paid guides.

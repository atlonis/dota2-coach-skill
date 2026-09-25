# 49 · BalloonDota: six fundamentals that decide most games

- **Video:** [Dota 2 Is WAY Easier Than You Think (No BS Guide)](https://youtu.be/PrPEWVHNkPw) · BalloonDota · 2026-03-22 · 8 min · English
- **Patch at publication:** 7.40c. Hero and item examples are left out.
- **Type:** scripted overview guide
- **Source:** auto-generated captions only; includes a coaching promotion

## Core idea

Most games are won by basics, not by mechanics or trivia. Many of the coach's 3K students know obscure interactions but are stuck because their basics are weak, and they blame drafts and teammates. The player is the only constant in his games. Six fundamentals repeat every match:
1. lane better;
2. farm faster;
3. die less;
4. move with purpose;
5. buy the right items;
6. don't throw.

## Findings

### F1 · 1:04–2:07 · lane · lane outcomes aren't predetermined

**Claim.** Don't decide the lane from the matchup. Outcomes change with waves, cooldowns, positions and numbers; even a bad matchup has 2v1 windows. Watch health bars, levels, cooldowns and hero numbers. Keep health above 80% and mana above 50%, and send regen early. If the lane becomes unplayable by levels 5–6, shove waves and farm the jungle instead of staying.

**Signal — partly observable.** The matchup and result from `lane.opponents` and `lane.selectedSideOutcome`, and regen purchases from `items.purchases`. Health and mana are not recorded.

### F2 · 2:07–3:09 · farm · camps are fillers

**Claim.** Most important farming happens between about 8 and 25 minutes. Good farming is a loop: push a lane, move forward, clear nearby camps, push the next wave. Relying on camps while lane creeps die slows you and gives up map pressure. Supports need farm too: stacks, pulls, empty lanes, small camps.

**Signal — partly observable.** Last hits and net worth by minute from `series`. Lane versus neutral share is derivable from the collected `events.cs`.

### F3 · 3:09–4:12 · any stage · die less by watching the minimap

**Claim.** How you die matters more than how often. Trading a life for an objective or a won fight is fine; being caught farming, front-lining or overextending is not. Spend at least half your screen time on the minimap, tracking missing heroes, and keep asking what can kill you right now. Treat unseen enemies as nearby. In fights, stay alive and cast from the edge unless you have survivability.

**Signal — observable.** Deaths with their context in `deathAnalysis.contexts`: nearby enemies and allies, teamfight membership and the item uses before each death.

### F4 · 4:12–5:47 · midgame · move with purpose

**Claim.** From about 8 to 25 minutes, rotate only for a guaranteed kill, a free lane or an area too dangerous to stay in. The coach expects most cores to reach 10–12K net worth by 20 minutes. From about 25 minutes, group with your team when it is ready to push; random pushing and farming alone lead to deaths. Before any play, ask:
- How likely is it to succeed?
- What is the risk against the reward?
- Is the enemy low or overextended?
- What do I give up?

**Signal — partly observable.** Net worth at 20 minutes from `series.netWorth`, and deaths away from allies from `deathAnalysis.contexts`.

### F5 · 5:47–6:50 · items · survivability before damage

**Claim.** The most common core mistake in the coach's reviews is buying damage before survivability; damage doesn't matter if you die first. By 20–30 minutes every core should have one or two items that keep him alive in fights. After that, buy to solve the problems of this game. A support whose cores struggle can move to semi-core items.

**Signal — observable.** Item times from `items.purchases`, and what each item does from `mechanics.items`.

### F6 · 6:50–7:51 · late game · don't throw

**Claim.** Common throws:
- front-lining while enemies are missing;
- going up the high ground without the Aegis, or with all enemies alive;
- chasing kills and dying.

Pick enemies off one by one, keep waves pushed and take their camps, take Roshan, drain their resources, then siege. Three or four deaths in a row late in the game usually lose it.

**Signal — observable.** Late deaths from `deathAnalysis.contexts`, and the Aegis and buildings from `objectives`. `teamEconomy` shows a lead being thrown.

## Exercises the coach gave

- Keep health above 80% and mana above 50% in lane.
- Spend half your screen time on the minimap.
- Ask the four rotation questions before every play.

## Not taken

- Hero and item examples (7.40c).
- The coaching promotion.

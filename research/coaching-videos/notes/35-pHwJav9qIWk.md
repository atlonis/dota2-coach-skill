# 35 · mugetsu: nine macro rules for the whole team

- **Video:** [ТЫ Играешь по МИКРО И МАКРО НЕ ПРАВИЛЬНО, и вот почему..](https://youtu.be/pHwJav9qIWk) · mugetsu · 2025-03-07 · 12 min · Russian
- **Patch at publication:** 7.38b. Rune spawn times and Roshan respawn arithmetic are patch dependent and left out.
- **Type:** scripted macro guide
- **Source:** auto-generated captions only; includes a sponsored segment

## Core idea

Micro is how you control your hero, and it can be trained on the training map. Macro is understanding the situation and deciding from it, and it mostly comes with experience. The guide gives team-level rules for runes, spikes, towers, Roshan, the high ground, focus targets and defence.

## Findings

### F1 · 1:37–2:39 · lane · a support leaves the lane only in two cases

**Claim.** A support may go through the twin gate or to a rune only when:
- the lane is hopelessly lost; or
- the carry can hold it alone without dying.

Contest the power rune from about 10 seconds before it spawns. Contest the wisdom rune only on a hero with control. Getting there first can decide the game, because an early level 6 for a support wins early fights.

**Signal — partly observable.** The carry's last hits and deaths are observable only for the selected player. The support's movement is derivable from its position row. Rune pickups are collected but not published.

### F2 · 2:39–3:43 · early game · play from power spikes

**Claim.** A power spike is the window when a hero becomes much stronger from an item, a level, a spell or a talent. When your hero spikes, call a fight: under smoke, or at an objective such as a tower.

**Signal — partly observable.** Item times come from `items.purchases`, skill and talent times from `skillBuild`, and levels from `series.xp`. Fights after a spike are derivable from OpenDota's teamfights.

### F3 · 3:43–4:44 · midgame · tower priority

**Claim.**
1. The mid first tower opens the most map.
2. The safe-lane first tower opens farm for your carry and the twin gate.
3. The offlane first tower opens little early on; take it, but don't aim for it.

Next, the safe-lane second tower: it makes Roshan safer, because enemies must come from their third tower.

**Signal — observable.** Towers, their lanes and times come from `objectives`.

### F4 · 4:44–8:19 · midgame · Roshan and the high ground

**Claim.**
- Go to Roshan only after the enemy's safe-lane first tower falls, ideally the second too; otherwise the enemy teleports in.
- Give the Aegis to the hero who will push the high ground and take tower hits.
- Siege the high ground only with the Aegis and with all five. The Aegis lasts several minutes: first farm the one missing key item.
- Don't bait and dive the base towers for a kill.
- After one side falls, push the other lanes.
- If a key enemy buys back, back off.

If even the Aegis can't break the high ground, cut the enemy's farm and out-farm them.

**Signal — partly observable.** Roshan, Aegis, tower and barracks events come from `objectives`, and item times from `items.purchases`. Deaths during a siege come from `deathAnalysis.contexts`.

### F5 · 8:19–9:21 · teamfight · choose focus targets you can actually kill

**Claim.** Kill the enemy's save supports first. When the target is unclear, pick one your hero can reach or force. Hitting an unkillable hero wastes your resources while your team dies.

**Signal — not observable.** Targets are not recorded.

### F6 · 9:21–11:24 · late game · defend by split-pushing, or give a side to finish an item

**Claim.**
- Against a siege you can't hold, split-push another lane, and call the fight when the enemy teleports onto the split-pusher.
- If you need an item to fight, giving a tower or a side is fine, unless the enemy pushes too fast.
- Split-push from 15–20 minutes only when you know where every enemy is.
- Against an enemy split-pusher, catch him with a smoke or a control hero.

**Signal — partly observable.** Towers and barracks lost come from `objectives`. The split-pusher's position is derivable from his position row.

## Exercises the coach gave

None.

## Not taken

- The rune spawn times, the Roshan respawn arithmetic and the Roshan minutes (7.38b).
- The claim about skipping waves to trigger backdoor protection, which is unclear.
- Hero examples and the sponsored segment.

# Death analysis

How to read `deathAnalysis` and talk about deaths. It governs claims; it never licenses inventing replay data.

## Where deaths come from

`deathAnalysis.timelineSource` names the source of the death list:

- `opendota_deaths_log`: every death of the player from the parsed replay, with the killer (a hero, or a unit class: `building`, `lane_creep`, `neutral`, `roshan`, `tormentor`, `unit`), seconds dead and gold lost. Works without a STRATZ token.
- `opendota_kills_log`: an older parse; deaths to heroes only, rebuilt from the killers' logs. Deaths to towers or creeps stay in `unresolvedCount`.
- `stratz`: STRATZ playback, with positions, nearby heroes, the player's item and ability uses and teleports. OpenDota still adds gold lost and the killer unit; a death only OpenDota logged appears with `source: opendota_deaths_log`.
- `null`: no death list (the replay is not parsed). The scoreboard total stands; nothing can be said about when or how the deaths happened.

Deaths before the horn (negative times) count; a pre-game first blood is a real death. Seconds dead end at a buyback: 3 seconds dead followed by a buyback at the next second is a bought-back death, not a short respawn timer. `byKiller` counts deaths by killer. A context with `contextReady: true` has every input; the match-wide `deathContext` capability needs all of them.

## Teamfights

`teamfight.inFight` reads OpenDota's recorded teamfights, which exist only for a cluster of **three or more deaths**:

- `true`: inside a recorded teamfight; `involvement` lists the allies and enemies who dealt damage, healed, killed or died in it.
- `false`: no recorded teamfight covers it, so at most one or two deaths happened around it: a gank, a pick-off or a small skirmish. Say "outside a big fight" or "in a gank or a skirmish of one or two deaths", never "not in a fight" (the hero may still have fought).
- `null`: unknown, including any death in the last 30 seconds that no fight covers (a fight running into the end of the match is often not recorded).

## Position and proximity (STRATZ)

A position supports proximity only when it is at most **3 seconds** old. "Nearby" is a radius of **20 map cells, about 2,560 game units**: the same area of the map, wider than most cast ranges, not "within reach of help". With `proximityComplete: false`, an empty list means unknown, not nobody. Without STRATZ, a position exists only for a death inside a recorded fight (OpenDota's fight cell).

## Observations

- `isolated`: positions complete, no ally nearby, at least two enemies nearby.
- `afterConfirmedTeleport`: within 15 seconds of a relocation caused by the player's own teleport item.
- `firstAlliedDeathInFight`: the first death on the player's side inside a recorded teamfight (works from OpenDota alone).
- `tradedLocally`: an enemy died within ±10 seconds and the same radius.
- `ownDefensiveItemUsed`: the player used Force Staff, Hurricane Pike, Glimmer Cape, Ghost Scepter, Eul's Scepter, Wind Waker or Black King Bar in the last 5 seconds.

`true` and `false` mean the prerequisites were observed; `null` means undetermined, never "no". A **pattern** is two or more deaths sharing the same confirmed observations: a pattern in this match, not a permanent habit.

## How to talk about a death

For a death you interpret, keep three layers:

1. **Fact:** time, killer, gold lost, seconds dead, fight status and involvement, confirmed observations, each with its own time (a TP at 9:48, a relocation at 9:50, Force Staff at 9:58 and the death at 10:00 are four facts).
2. **Hypothesis** (optional): allowed with two or more independent facts, labelled, with a confidence word. "Four deaths to Silencer, two of them as the first Dire death in a fight → Silencer probably caught you first in fights (hypothesis, medium confidence)".
3. **Unknown:** what blocks a stronger statement, in plain words: no positions without STRATZ, no vision data, cooldowns not recorded.

Then the **coach's advice** for the pattern, labelled, with a condition ("if you keep dying first in fights, stand behind the frontliner until the enemy initiator has used his spells"), and the drill.

## Choosing the key death

The runtime's `priorityDeathTime` is a candidate: the representative of the largest pattern, else the longest time dead, later time breaking ties. Choose the death that best illustrates the main finding; it need not be the runtime's candidate, and don't relabel another death as that candidate. An objective or buyback after a death is a separate fact, not proof that the death caused it.

## Never claim

That the player did not see something, that a spell was ready, that an enemy had no cooldown, that the player certainly could have escaped, or that an item use was early, late or wasted, unless the artifact records it. Phrase the alternative as advice with "if".

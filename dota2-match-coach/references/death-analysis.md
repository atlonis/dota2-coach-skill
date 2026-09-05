# Death-analysis policy

Use this policy when the artifact contains `deathAnalysis`. It governs claims in the coaching review; it does not authorize reconstruction of missing replay data.

## Window and inputs

Each selected-player death has a context window from **15 seconds before** its time through **5 seconds after** it. Read the normalized context, its `unavailable` list, event timestamps, entity references, teamfight interval, and `dataQuality.capabilities`. A name that is `null` stays a localized neutral “unknown entity” in coaching prose; never guess it from hero knowledge or show an internal ID.

## Position freshness and radius

For each participant, a position can support proximity only when its last recorded point is no later than the death and is at most **3 seconds** old. Nearness is an Euclidean radius of **20 minimap cells** (about 1,200 game units) from the selected player's valid death position. A missing or stale point makes that participant's proximity unknown; it does not make them absent.

## Observable flags

The runtime may report only the following observations:

- `isolated`: positions are complete for the prerequisite live participants, no ally is nearby, and at least two enemies are nearby;
- `afterConfirmedTeleport`: death is within 15 seconds of a reposition whose cause is the player's confirmed teleport item;
- `firstAlliedDeathInFight`: it is the first death on the player's side inside a valid OpenDota teamfight interval;
- `tradedLocally`: an enemy dies within **±10 seconds** and the same 20-cell radius;
- `ownDefensiveItemUsed`: the player used an allowed defensive item in the **-5..0 second** window;
- `contextIncomplete`: one or more prerequisites for tactical context are unavailable.

These flags are observations, not intent or a tactical verdict. For example, a confirmed teleport establishes the movement cause; it does not prove the player chose a fight alone.

## Defensive-item allowlist

Only a confirmed use of one of these items can set `ownDefensiveItemUsed`: **Force Staff, Hurricane Pike, Glimmer Cape, Ghost Scepter, Eul's Scepter of Divinity, Wind Waker,** or **Black King Bar**. A passive trigger such as **Aeon Disk** is not an item use: the source does not prove its availability or activation timing.

## `true`, `false`, and `null`

`true` means all prerequisites were observed and the condition held. `false` means all prerequisites were observed and the condition did not hold. `null` means the condition could not be determined. Never paraphrase `null` as “no” or “did not happen.” `contextIncomplete` is a warning about coverage and never contributes to a pattern signature.

## Patterns in this match

A pattern exists only when at least **two** deaths share the same non-empty signature of confirmed-`true` observations. It is a pattern **in this match**, not a permanent player habit. If there is no qualifying repeated signature, say so only when the corresponding pattern capability is available; otherwise say that repetition cannot be established.

## Priority death

Use the artifact's priority-death ordering: representative of the largest repeated pattern; otherwise a death in a confirmed turning window; otherwise the greatest `timeDead`, breaking a tie by later timecode. Do not replace this order with a more dramatic-looking episode.

## Facts, supported hypothesis, unavailable evidence

For the priority death and every compact death row, keep three distinct layers where applicable. Copy every rendered timecode directly from the matching artifact field and compare repeated mentions before sending; never reconstruct a timecode from memory. Facts retain their own timestamps: nearby enemies at 14:58 are not facts about a 14:50 arrival or the earlier teleport choice. Preserve distinct event times such as TP use at 9:48, reposition at 9:50, nearby units/Force Staff at 9:58, and death at 10:00.

1. **Fact:** timestamped artifact evidence, such as the confirmed reposition, observed nearby entities, item use, or `timeDead`.
2. **Supported hypothesis:** only a cautious inference directly supported by a further event fact, explicitly labelled as a hypothesis and with a confidence level.
3. **Unavailable:** the missing data that prevents a stronger explanation, such as vision, enemy cooldowns, a stale position, or an unresolved source conflict.

Hypotheses must not smuggle in a new fact. For a signature-only priority death, use this closed form (localized with the rest of the answer): **«Поддерживаемая гипотеза (средняя уверенность): повторённая подтверждённая сигнатура — риск-паттерн этой игры и приоритет для проверки. Она не объясняет причину смерти.»** No other behavioural, timing, item-effect, destination-state, or counterfactual hypothesis is permitted unless the artifact has an explicit field for it.

## Forbidden causal language

Do not say or imply “you did not see,” “the ability was ready,” “the player definitely could have escaped,” “the enemy had no cooldown,” or that a different click would certainly save the player. With a signature alone, do not attribute a missing or insufficient safety check, a retreat or entry decision, Force Staff being early, late, insufficient, failed, effective, or outcome-changing, an item's effectiveness, an occupied destination, or a should-have timing. Do not assert intent, vision, mana/health state, aim, target, direction, or correctness of an item use unless the artifact directly contains that fact. Prefer the closed signature form and “the data does not establish…”.

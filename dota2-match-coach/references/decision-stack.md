# Decision stack: the layers of Dota 2 mechanics

A reference for coaching reviews: how to split the game's mechanics into layers, and which layer a given finding belongs to.

## Why a stack and not a pyramid

A pyramid lies twice:

- it implies an order of learning ("do not touch the top until you own the bottom") — yet in Dota, drafting and timings are learned before orb walking;
- it implies the base matters most — while in fact **the leverage grows upward**: perfect last hits do not save a lost draft, and a good draft carries crooked last hits.

Mechanics are ordered not by importance but by two nearly collinear axes that together give one linear stack:

| Axis | From | To |
|---|---|---|
| Decision horizon — how long the decision binds you | 0.1 s | 45 min |
| Reach — what the decision touches | one unit | the whole map, the whole match |

## Overview of the layers

| Layer | Name | Horizon | Leverage on the outcome | What the runtime covers it with |
|---|---|---|---|---|
| L0 | Engine | outside time | 2/5, but a multiplier for every layer above | reference material (Liquipedia), not from the match |
| L1 | Micro | 0.1-3 s | 3/5 | `lh_t`, `dn_t` in the `lane` phase |
| L2 | Fight | 3-30 s | 4/5 | `killEvents` and `deathEvents`, `hero_damage_t`, teamfights |
| L3 | Lane and economy | 1-10 min | 4/5 | `gold_t`, `xp_t` in the `lane` and `transition` phases |
| L4 | Map | 5-20 min | 5/5 | the weakest: wards and vision are absent from the normalized rows |
| L5 | Match timings | 10-45 min | 4/5 | purchases, the `midgame` and `closing` phases |
| L6 | Draft and meta | the whole match | 5/5 | `draft` from STRATZ `pickBans`, the patch |

Leverage is an editorial estimate, not a measured quantity. It answers "how expensive is a mistake on this layer", not "how hard is this layer to learn".

---

## L0 — Engine

Not a "skill" but the constants everything else is derived from. This layer explains decisions on all the layers above.

| | |
|---|---|
| **What you decide** | Nothing — you know. The layer gives the units of measurement: what a second costs, what a point of armour costs, what is physically possible. |
| **Horizon** | outside time |
| **Leverage** | Low directly, but a multiplier for every layer above: without it the upper decisions are made on feel. |
| **Typical mistake** | Arguing with the game instead of the arithmetic: armour against magical burst, kiting on a hero without turn rate, "I got unlucky" where a formula did its work. |
| **Metric** | Whether you can name your EHP, the deny threshold and your attack animation time without a prompt. |
| **How to train** | Demo mode and a calculator. Five minutes of counting damage by hand beats an hour of playing. |
| **Data** | Reference material. Static tables; nothing is needed from the match. |

Anchor facts (verified against the Russian Liquipedia):

- Armour does not give a percentage directly: `reduction = 0.06*A / (1 + 0.06*|A|)` — the returns diminish, but EHP grows linearly.
- Sources of magic resistance stack **multiplicatively**, so 100 per cent is unreachable in principle.
- Turning: a unit starts an action only when the target is within an `11.5°` cone; a 180° turn takes `0.15-0.19 s` on most heroes.
- Deny threshold: `50 %` HP on creeps, `25 %` on heroes, `10 %` on towers.
- A denied creep gives an enemy within `1500` range only `40 %` of the experience and no gold at all.
- Vision is shared across the team, including creeps and buildings; nobody sees through trees or up a cliff except flying units.

## L1 — Micro

Everything done by hand with a single hero within a couple of seconds.

| | |
|---|---|
| **What you decide** | Last hits and denies, animation cancels, orb walking, creep aggro, wave blocking, manual item casts, micro-positioning in a fight. |
| **Horizon** | 0.1-3 s |
| **Leverage** | Medium and strongly role-dependent: on a core it converts into gold directly, on a support it barely converts at all. |
| **Typical mistake** | Sitting through the backswing instead of cancelling it; a stray attack pulling creep aggro at the moment the wave is already coming to you. |
| **Metric** | Last hits and denies at minute 10 against the benchmark for your hero and role, not against an abstract "80 out of 80". |
| **How to train** | Ten minutes a day in the last-hit trainer, then the same ten minutes against a bot that denies. |
| **Data** | `lhPerMin` and `deniesPerMin` in the `lane` phase; comparison with the lane opponent. |

- The only layer that trains fully outside matches. That makes it convenient to fix first — but not because it is "the base".
- A mistake here costs 40-60 gold. On L6 one mistake costs the whole match.

## L2 — Fight

The exchange of resources in a collision: who pressed first, who got focused, who got out.

| | |
|---|---|
| **What you decide** | Cast order, focus, initiation and the cooldown trade, tracking enemy BKBs and ultimates, the moment to leave the fight. |
| **Horizon** | 3-30 s |
| **Leverage** | High: one well-traded fight buys an objective, one bad one gives away the high ground. |
| **Typical mistake** | Control into a BKB and an ultimate dumped on the first target available; entering a fight with no exit planned. |
| **Metric** | The share of fights where the key ability hit two or more targets, and the share of deaths within the first 3 seconds of the fight. |
| **How to train** | Replay paused at the moment of initiation: say out loud which cooldowns the enemy has right now. |
| **Data** | `deathEvents` by phase, `heroDamagePerMin`, teamfights from OpenDota. Enemy cooldowns cannot be reconstructed from the data. |

- The first layer where a decision is made for the team rather than for yourself: communication starts here.
- Most "lost fights" were lost before the fight — on L4, on vision and on position.

## L3 — Lane and economy

How the resource of the lane and the jungle turns into gold and experience, yours and your ally's.

| | |
|---|---|
| **What you decide** | Splitting the lane resource between core and support, pulling and stacking camps, rune control, courier routing, wave management and the equilibrium point. |
| **Horizon** | 1-10 min |
| **Leverage** | High in the first 15 minutes: it sets when the L5 spikes happen. |
| **Typical mistake** | Pushing the wave with no reason and no vision; stacking a camp nobody will farm; taking experience from your own core. |
| **Metric** | GPM, XPM and net worth at minute 10 relative to the lane opponent, not relative to the whole team. |
| **How to train** | One game whose only task is to hold the wave near your own tower and predict where it will settle. |
| **Data** | `goldPerMin` and `xpPerMin` in the `lane` and `transition` phases, lane outcome from STRATZ. The best-covered layer. |

- Bounty runes appear at every point at `0:00`, then every 3 minutes in both teams' jungles.
- Laning is not "farming" but bargaining: you trade position and HP for a share of the lane's total resource.

## L4 — Map

Information and space: who sees what, and who can be where in the next thirty seconds.

| | |
|---|---|
| **What you decide** | Placing and removing wards, smokes, roams, outposts, split pushing, trading objectives, where the team physically is. |
| **Horizon** | 5-20 min |
| **Leverage** | The highest of those executed inside the match: vision decides a fight before it starts. |
| **Typical mistake** | Wards placed out of habit in standard spots the enemy dewards from memory; grouping as five with no goal — the most expensive way to do nothing. |
| **Metric** | Ward lifetime and the share of enemy ganks that happened inside a lit zone. |
| **How to train** | Watch the replay through the enemy's eyes: where were you predictable, and which single ward would have been worth a life. |
| **Data** | A weak spot. Wards and vision are absent from the normalized rows; conclusions rest on death locations, phases and roles. Mark L4 claims as heuristics. |

- An outpost is captured faster with several heroes present: the time is divided by their number.
- Allied creeps and buildings also give vision — free vision almost nobody counts.

## L5 — Match timings

A match is made of windows in which you are stronger than the enemy. This layer is about noticing a window and spending it.

| | |
|---|---|
| **What you decide** | Item and level spikes, Roshan and the aegis, the glyph, buyback economy, the high-ground window, the moment to end the match. |
| **Horizon** | 10-45 min |
| **Leverage** | High: the strongest spike spent farming the jungle is equivalent to no spike at all. |
| **Typical mistake** | Finishing an item and continuing to farm; a buyback for one fight after which there is nothing left to defend the base with. |
| **Metric** | How many minutes passed between a spike and the team's next action on an objective. |
| **How to train** | Say it out loud: "in 40 seconds I have BKB — what are we taking with it". |
| **Data** | Purchase times, the `midgame` and `closing` phases, objectives from OpenDota. Timings are computed reliably. |

- Roshan: `6000` HP, `30` armour, `55 %` magic resistance — he cannot be killed without physical damage.
- The aegis is not a reward for a fight but a timer: it is either spent or wasted.

## L6 — Draft and meta

The only layer that binds for all forty-five minutes and rewrites the price of every decision below.

| | |
|---|---|
| **What you decide** | Picks and counter-picks, synergies, role distribution, the team's win condition, playing the current patch. |
| **Horizon** | the whole match |
| **Leverage** | The highest. A draft does not win the match, but it sets which scenario on L4 and L5 can win at all. |
| **Typical mistake** | Taking a comfort hero into a draft where that role is already filled; taking a counter-pick and then playing as if there were no counter-pick. |
| **Metric** | Whether at the end of the draft you can say in one sentence how this five wins and by which minute. |
| **How to train** | Reviewing other people's drafts without playing: name the win condition of both sides before minute one. |
| **Data** | `draft` from STRATZ `pickBans` or the line-ups from OpenDota, plus the current patch and win rates. |

- Precisely because drafting is learned before orb walking, this is a stack and not a pyramid: the order of learning does not match the order of layers.
- A patch changes L6 instantly and L0 almost never. The higher the layer, the faster it goes stale.

---

## Cross-cutting — not a layer

Mental state and tilt, communication, execution discipline. They hit every layer at once: tilt does not "spoil L2", it simultaneously breaks last hitting, cast order, vision and the buyback decision. So they cannot be placed as a floor — only as a band alongside.

- **Mental state** — the error rate rises on every layer, but the top falls off first: the player stops looking at the map and stays in micro.
- **Communication** — the only way to synchronize L2 and L4 with four other players.
- **Discipline** — the gap between "I know the right decision" and "I executed it". Visible only on the replay.

## Match timeline

Layer dominance is how much it determines the outcome at that moment. Scale: `...` background, `▪▪▪` noticeable, `███` decisive.

| Layer | 0-10 min | 10-25 min | 25-50 min |
|---|---|---|---|
| L0 Engine | `...` | `...` | `...` |
| L1 Micro | `███` | `▪▪▪` | `...` |
| L2 Fight | `▪▪▪` | `███` | `███` |
| L3 Lane | `███` | `▪▪▪` | `...` |
| L4 Map | `▪▪▪` | `███` | `███` |
| L5 Timings | `...` | `▪▪▪` | `███` |
| L6 Draft | `▪▪▪` | `▪▪▪` | `▪▪▪` |

Two observations the timeline exists for:

- **L6 does not end at minute zero.** The win condition from the draft runs as an even background through the whole match and decides which actions on L4 and L5 make sense at all.
- **L1 does not disappear, it stops being the bottleneck.** The price of one last hit falls, the price of one ward rises.

The phase boundaries match `PHASES` in `scripts/lib/normalize.mjs`: `lane` 0-10 min, `transition` 10-15, `midgame` 15-25, `closing` 25+.

## How to use this in a review

1. Assign the finding to a layer — that immediately sets the horizon, the metric and the training format.
2. Check whether the problem is a symptom of a layer above. Deaths on L2 are explained by L4 in about 60 per cent of cases; an L3 failure at minute 15 is explained by L6.
3. Never present an L4 conclusion as a measured fact: this layer is not covered by data in the current runtime.
4. Prioritize recommendations by leverage, not bottom-up by layer. One L4 or L6 conclusion is worth three on L1.

## Sources and caveats

The L0 numbers and anchor facts were verified against the Russian Liquipedia through its API:

- [Armour](https://liquipedia.net/dota2gameru/%D0%91%D1%80%D0%BE%D0%BD%D1%8F)
- [Magic resistance](https://liquipedia.net/dota2gameru/%D0%A1%D0%BE%D0%BF%D1%80%D0%BE%D1%82%D0%B8%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D0%BC%D0%B0%D0%B3%D0%B8%D0%B8)
- [Turn rate](https://liquipedia.net/dota2gameru/%D0%A1%D0%BA%D0%BE%D1%80%D0%BE%D1%81%D1%82%D1%8C_%D0%BF%D0%BE%D0%B2%D0%BE%D1%80%D0%BE%D1%82%D0%B0)
- [Denying](https://liquipedia.net/dota2gameru/%D0%94%D0%BE%D0%B1%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5)
- [Vision](https://liquipedia.net/dota2gameru/%D0%9E%D0%B1%D0%B7%D0%BE%D1%80)
- [Runes](https://liquipedia.net/dota2gameru/%D0%A0%D1%83%D0%BD%D1%8B)
- [Roshan](https://liquipedia.net/dota2gameru/%D0%A0%D0%BE%D1%88%D0%B0%D0%BD)
- [Outpost](https://liquipedia.net/dota2gameru/%D0%90%D0%B2%D0%B0%D0%BD%D0%BF%D0%BE%D1%81%D1%82)
- Full index: [Mechanics](https://liquipedia.net/dota2gameru/%D0%9C%D0%B5%D1%85%D0%B0%D0%BD%D0%B8%D0%BA%D0%B0)

Caveats:

- Formulas barely change between patches; specific values do. Per `source-policy.md`, current numbers are verified against Valve, and Liquipedia stays the source for explaining mechanics.
- The leverage estimates, typical mistakes, metrics and the timeline are editorial; they are not in the wiki.
- Not verified and therefore not included: the buyback formula, the accuracy penalty when attacking uphill, day and night duration, and the glyph cooldown. Liquipedia applies a rate limit with a CAPTCHA on frequent requests; those numbers should be collected in a separate pass with few requests, with gzip and an own `User-Agent`, per their API terms of use.

Compiled on 27 August 2026.

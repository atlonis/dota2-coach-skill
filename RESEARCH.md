# Source research for the Dota 2 Match Coach skill

Verified on: 25 August 2026.

Status: the research is recorded; the first version of `dota2-match-coach` was built on it.

## What we are building

Dota 2 Match Coach is a personal post-match Dota 2 coach. It must turn match data into a short review:

1. what the main problem was;
2. where it showed up;
3. why it matters for this specific hero, role, rating and patch;
4. what to train in the next games.

The key separation:

> Match data is not the rules of the game, is not a comparative baseline, and is not a coaching conclusion.

No single source covers all four layers.

## Product decisions on record

- The answer format is hybrid: four match stages plus a dynamic turning point and one main training pattern.
- The structure is adapted from the BSJ Replay Review Template: match line, draft, laning, mid and late game, key moments and an action plan.
- Dota2ProTracker is excluded from the runtime chain. STRATZ was chosen as the future source of role benchmarks, strong players and recent builds; collecting those separately and automatically is deferred to the roadmap. OpenDota is used as an additional check.
- Deep reconstruction of a raw `.dem` is deferred. In the first version, micro-mechanics are limited to what is provable from OpenDota and STRATZ playback; the future module is broader than analysing missed creeps.

## Recommended source map

| Layer | Source | What it gives | Limits | Role in the MVP |
|---|---|---|---|---|
| Match data | [OpenDota API](https://api.opendota.com/api) | Result, players, purchases, ability build, per-minute gold, XP, LH and denies, wards, actions, damage, teamfights, lane and role estimates, rank and the replay URL | Not every match is parsed; some players are anonymous; a replay can disappear; some fields are estimates | Primary source |
| Exact episode data | [OpenDota replay parser](https://github.com/odota/parser) on top of [Clarity](https://github.com/skadistats/clarity) | Combat log, entities, positions, effects, events and other replay data | Needs the `.dem`; Valve stores replays for a limited time; the data still does not reveal intent or team communication | Deferred to a separate deep mode |
| Current rules | [Valve Dota 2 Datafeed](https://www.dota2.com/datafeed/herodata?language=english&hero_id=107) | Current stats of heroes, abilities, talents and items in structured JSON | A first-party site backend, but not a documented or versioned Valve API; the schema must be validated | Mandatory source for matches on the current sub-patch |
| Match version | [Valve patch timeline](https://www.dota2.com/datafeed/patchnoteslist?language=english) and the [official patch notes](https://www.dota2.com/patches/7.41e) | The full timeline, including lettered patches (`7.41a` to `7.41e`), and the official changes | Patch notes describe a delta, not always the full state of a mechanic | Mandatory source |
| Explaining mechanics | [Liquipedia Dota 2 Wiki: Mechanics](https://liquipedia.net/dota2/Mechanics) | Human-readable explanations of mechanics, interactions, heroes, items and changelogs | Community-maintained; delays and errors are possible. The old Fandom is not an equivalent mirror | Second source for explanation and cross-checking |
| Comparison by rating | [OpenDota `/benchmarks`](https://api.opendota.com/api) | Percentiles by hero and rank bracket 1-8 for GPM, XPM, LH/min, KDA, damage and other metrics | No filter by role or specific patch; the Immortal sample is sometimes empty; final metrics lose match context | A cautious baseline in the MVP |
| Role and high-rating meta baseline | [STRATZ](https://stratz.com/welcome) | GraphQL, position 1-5, hero leaderboard, role and rank stats, recent matches of strong players, playback, lane and item analysis, and IMP | Needs a token and the exact mandatory `User-Agent: STRATZ_API` header; the schema is more complex; closed metrics are not evidence | Primary source of role context and playback in the MVP |
| Alternative parse analytics | [Imprint Esports API](https://docs.api.imprint.gg/match-endpoints) | A parse-level match object, position 1-5, time series, item and ability timelines and Imprint analytics | A new service; needs an API key and an individually negotiated plan | A promising candidate after the MVP |
| Human verification | A review by a strong player or coach | Checks whether the skill found a real cause rather than a plausible template | Cannot be automated | Mandatory for quality assessment |

## What was verified against live responses

### OpenDota

- The current OpenAPI is version `31.1.0` and explicitly advertises advanced match data from replays.
- On a parsed recent match the API returned ten players, the replay URL, teamfights, purchases, kills, wards, `gold_t`, `xp_t`, `lh_t`, `dn_t`, `lane_pos`, damage, actions and `position_est`.
- `position_est` is exactly an **estimate** of position 1-5 from early farm priority and lane data, not a guaranteed role.
- `/benchmarks` accepts a hero and a bracket from Herald to Immortal. Its parameters include neither role nor patch.
- At the time of the check, anonymous access showed a limit of about 60 requests per minute and 3000 per day. That is an observation, not a contract: limits must be read from the response headers and handled dynamically.
- A match can be sent for parsing through `POST /request/{match_id}`, after which the job state can be polled. The presence of a basic `players` array does not mean the replay is parsed: `version` and the replay-derived fields and timelines are needed.

### The user's control matches

Player identifier: `account_id: 56386500`. He was found on Earth Spirit in both matches.

| The user's assessment | Match ID | Mode | Result and final data | OpenDota state |
|---|---:|---|---|---|
| Bad | `8963363814` | Ordinary public matchmaking, All Draft | Win; 32:17; 4/8/16; 193 LH; 485 GPM; 515 XPM; 14642 NW | Parse requested and completed: `version: 22`, replay URL, position 2 mid, 33 gold, XP and LH points, 9 teamfights, and full purchase and event logs |
| Not good, but passable | `8963443105` | Ordinary public matchmaking, All Draft | Win; 38:49; 12/8/22; 247 LH; 586 GPM; 823 XPM; 18385 NW | Parse requested and completed: `version: 22`, replay URL, position 2 mid, 39 gold, XP and LH points, 14 teamfights, and full purchase and event logs |

Both matches started on 24 August 2026 and belong to `7.41e` by Valve's official timeline. The pair is especially useful as a check: both matches were won, yet the user distinguishes the quality of his own play. So the future coach cannot use a win or a loss as a substitute for analysis.

Before the parse request, OpenDota showed the warning `The replay for this match has not yet been parsed` and only a scoreboard. Requests were submitted for both matches; the jobs completed successfully, after which the replay-derived data appeared. So parse-first is a mandatory part of the runtime, not a manual caveat. Farm stretches, lane outcome and fight episodes can now be compared with evidence; the second match cannot be declared good merely because its final numbers are higher.

### The first manual reference answer, v0

The subject of the review is the bad match `8963363814`; match `8963443105` is used only as a self-baseline. The v0 format: the match line, draft and role context, four stages, the turning point, one strength, one main pattern and one exercise.

**Main problem:** after winning the lane, the player did not convert the advantage into the first key power spike and re-entered already unfavourable fights several times. That is more precise than the generic advice to farm more.

**Evidence:**

- STRATZ records the lane as `RADIANT_VICTORY` and the position as `POSITION_2`, yet the final IMP is `-15`; OpenDota shows lane efficiency of `77%`. So the start of the match is not the main problem by itself.
- Urn was finished at `3:58`, then Kaya at `11:21`, and Spirit Vessel only at `17:43`. In the self-baseline, Vessel was bought at `12:38`. That makes the Kaya into Vessel order a testable hypothesis, but does not prove a mistake without the context of the ten heroes and a relevant positional STRATZ sample.
- After the last early kill at `10:46` came a run of deaths at `14:19`, `16:19`, `17:07` and `20:43` with no kill of his own in between.
- The most evidenced episode: the death at `16:19`, 34 seconds until respawn, then a TP back into the next fight and another death at `17:07`. About 14 seconds passed between the respawn and the second death. Vessel was finished only after that episode.
- In the self-baseline, after Vessel at `12:38`, the player used the item twice in the fight at `14:12-15:07`, made two kills and did not die. That does not prove universal causality, but it shows that the same player can convert this early spike noticeably better.

**Interpretation:** high confidence in the loss of tempo from the chain of re-entries; medium confidence that the Kaya into Vessel order was the main cause. The data can prove the timings and the sequence of events, but cannot claim that an early Vessel would have changed every fight.

**One exercise for the next three games, the `power-spike gate`:** after Urn, finish Vessel before a secondary scaling item unless there is a deliberate reason to deviate. After a death, do not TP automatically into an ongoing fight: first name a concrete advantage for re-entering — a numbers advantage, the enemy's key abilities spent, or an objective being defended. Without one, take a safe wave or camp and come back after the spike.

This example sets the unit of evidence inside every stage:

1. the hero's task in this specific draft;
2. two to five verifiable facts with timecodes or an interval;
3. a comparison against the self-baseline and a relevant role, rank and patch sample;
4. an interpretation kept separate from the facts;
5. explicit confidence and the unproven counterfactual;
6. a concrete alternative.

After the four stages the report picks one turning point, one recurring pattern and one measurable exercise for the next three to five games.

### The exact patch

For a recent match, OpenDota returned `patch: 60`, which in its constants corresponds only to `7.41`. It does not distinguish `7.41a`, `7.41b`, ..., `7.41e`.

The correct algorithm:

1. take the match `start_time`;
2. load Valve's official `patchnoteslist`;
3. pick the last patch timestamp no later than the start of the match;
4. obtain the exact name such as `7.41e`;
5. compare it with Valve's latest sub-patch;
6. in v0, continue the analysis only on a match, otherwise return an explicit `unsupported_patch`;
7. only then load the current rules and the meta baseline.

### Valve Datafeed

`Datafeed` is our working name for the live JSON endpoints on Valve's `dota2.com` domain, such as [`herolist`](https://www.dota2.com/datafeed/herolist?language=english), [`herodata`](https://www.dota2.com/datafeed/herodata?language=english&hero_id=107), [`itemlist`](https://www.dota2.com/datafeed/itemlist?language=english) and [`patchnoteslist`](https://www.dota2.com/datafeed/patchnoteslist?language=english). No separate official documentation, OpenAPI schema, contract version or stability promise from Valve was found for them. This is a first-party site backend, not a supported Steam WebAPI.

A live check of `herodata` for Earth Spirit (`hero_id: 107`) returned the current base stats, abilities, innate, cooldown, mana and cast range, Aghanim values and talents: 23 strength, 17 agility, 17 intelligence, no facets. `patchnoteslist` ends at `7.41e`. The source is suitable for v0 because the scope of the skill is fixed to the current sub-patch only. The implementation needs an HTTP status and required-field check, a cache of the last successful response, and an explicit error when the schema changes.

### STRATZ

The STRATZ GraphQL API works: the user ran a `MatchDraft` query in the GraphiQL hosted on `api.stratz.com` and received `data.match.players`, including his own `steamAccountId: 56386500`. The neighbouring project `D:\vibe\dota` also has an enabled STRATZ adapter, the `https://api.stratz.com/graphql` endpoint and token reading from `STRATZ_API_KEY`; the user's env token is configured.

The root of the error was found in the mandatory header from the STRATZ documentation: every request must carry the exact value `User-Agent: STRATZ_API`. The old adapter used `User-Agent: DotaCompanion/0.1`. A controlled A/B test with the same endpoint, token and GraphQL body returned `403` for the old value and `200 application/graphql-response+json` for `STRATZ_API`. So Cloudflare cookies and transferring a browser session are not needed.

With the correct header, direct GraphQL requests successfully returned both control matches (`8963363814` and `8963443105`), ten players each; `steamAccountId: 56386500` was found on Earth Spirit (`heroId: 107`). The STRATZ site also shows positions, lane outcome, builds, charts and playback. In the first match, for example, Earth Spirit is identified as mid, and the site shows the Urn, Kaya, Vessel and Kaya and Sange timings.

After a successful parse, OpenDota already returned the position, the timelines and the teamfights. STRATZ nonetheless remains the primary source of the exact position 1-5 and detailed playback; collecting role and rank hero baselines and the hero leaderboard separately is planned in the roadmap. If STRATZ is unavailable, the report switches to an explicitly marked degraded mode. IMP is used only as an auxiliary closed signal, never as evidence of a mistake.

### Liquipedia versus the old Fandom

[The Dota 2 Wiki team moved the maintained wiki from Fandom to Liquipedia](https://www.reddit.com/r/DotA2/comments/1c4kg1n/official_announcement_dota_2_wiki_has_moved_to_a/) in 2024 and declared the Fandom copy unmaintained. Comparing [Earth Spirit on Liquipedia](https://liquipedia.net/dota2/Earth_Spirit) with the [old page on Fandom](https://dota2.fandom.com/wiki/Earth_Spirit) on 25 August 2026 confirms it:

- Liquipedia marks the state as `7.41e`, shows 23 base strength, 17 intelligence, no facets and the current passive Stone Remnant mechanic;
- Fandom shows 22 base strength, 18 intelligence, the old talent tree, and Recent Changes ending at `7.35d`;
- the current Valve Datafeed agrees with Liquipedia: 23 strength, 17 intelligence, no facets.

Conclusion: use Liquipedia for explanations and interactions; verify current numbers against the Valve Datafeed. Exclude Fandom from the runtime chain and keep it only as a possible source of old lore or archival text, explicitly marked.

### What Imprint and Clarity are

- **Imprint** is an external commercial data API provider, not a library. Its match endpoint promises a ready parse-level object: position 1-5, per-minute net worth, XP and LH, inventory, item and ability timelines, and its own rating. Access needs an API key and an individually negotiated plan. For v0 it is a potential alternative to STRATZ and OpenDota, not a mandatory source.
- **Clarity** is a Java library for reading a `.dem` replay file, not a ready match database. It extracts the combat log, entities, modifiers, game and user events, and a summary. It is needed if we download the replay ourselves and want to dissect a specific death or fight; for a final scoreboard it is overkill.

### The official Steam WebAPI

Conclusion: do not use `IDOTA2Match_570/GetMatchDetails`. The endpoint is broken for ordinary ranked pubs too, not only for custom and practice lobbies.

- Valve [issue `#24383`](https://github.com/ValveSoftware/Dota2-Gameplay/issues/24383) cites match `8187104544`, for which `GetMatchDetails` returned `{}` while the same Steam API key worked fine with `GetMatchHistory`.
- Per OpenDota, `8187104544` is an ordinary **ranked public matchmaking** All Draft match with ten players, not a custom or practice lobby.
- The more recent Valve [issue `#32617`](https://github.com/ValveSoftware/Dota2-Gameplay/issues/32617) of 18 May 2026 reports that the endpoint always answers HTTP 500 with an empty body since 7.36.
- In the current OpenDota configuration, `DISABLE_REAPI` is on by default with a comment that `SteamGetMatchDetails` is broken.

The authorized request for the two user pubs cannot be reproduced directly in the current environment: no Steam API key is configured here, and without a key Valve naturally answers 403. So a 403 without a key is not evidence of breakage; the evidence for pubs is the properly authorized ranked example plus the current OpenDota configuration.

Historically `GetMatchDetails` gave only the final object: ten players, the hero, final items, K/D/A, LH and denies, GPM and XPM, the winner, the duration, the start time, the mode and lobby, the final buildings, the score and the draft. It gave no replay-level positions, no per-minute curves, no purchase chronology and no context for specific fights. Even if Valve fixes the endpoint, for this skill it will be a scoreboard source, not a source for a deep review.

## An important limit: "clicks"

OpenDota does not give the stream of the player's actual mouse clicks. The `actions` field holds aggregated action types and counts. Clarity exposes user messages and spectator clicks, but that is not equivalent to a full record of the mouse, the camera and the player's intent.

From a replay one can confidently reconstruct **what happened**: positions, damage, casts, states and events. **Why the player made a decision** must be phrased far more carefully. Voice communication, the team's plan, the player's attention and most of the intent are absent.

## Trust hierarchy on a conflict

1. For exact current numbers: the Valve Datafeed with schema validation and a cross-check against the official patch notes.
2. For officially announced changes: Valve patch notes.
3. For match facts: the parsed replay, then OpenDota, STRATZ and Imprint.
4. For explaining how mechanics interact: Liquipedia, verified against the game files or patch notes.
5. For statistical expectations: a relevant sample of the same patch, hero, role, rating and mode.
6. For strategy and coaching interpretation: several sources plus human verification.

When sources disagree, the skill must name the disagreement and lower its confidence rather than silently pick the convenient answer.

## Recommended stack for the first prototype

Primary sources:

1. OpenDota — the match and basic rank benchmarks.
2. STRATZ — position 1-5, playback and lane outcome now; role and rank baselines and strong players after the corresponding roadmap stage is implemented.
3. Valve patch timeline and Datafeed — the exact sub-patch and the current mechanics.
4. Liquipedia — explaining mechanics and interactions.

Optional later:

- Imprint — parse-level analytics if access is available;
- a local replay plus Clarity or the OpenDota parser — a separate deep micro-mechanics mode after the foundation is in place.

## The boundary of an honest MVP

The MVP can review with reasonable confidence:

- farm tempo across stretches;
- lane efficiency and the drop after the lane;
- item timings and deviation from a relevant build;
- deaths, kills, buybacks and teamfight participation;
- wards, stacks, runes, damage and the use of abilities and items;
- mana windows, exact ability casts and successful last hits by ability, when STRATZ playback is available;
- recurring patterns across several matches;
- one main training focus for the next games.

Without a replay and the user's context, the MVP must not confidently claim:

- that a specific entry into a fight was unambiguously wrong;
- that the player "was not looking at the map" or "panicked";
- that an item is bad only because its win rate is lower;
- that a pro build is automatically optimal for the current rating;
- that a high or low final metric proves a mistake by itself.

Even with ordinary STRATZ playback, the MVP does not reconstruct every creep that existed, their health and the input sequence. So causal diagnosis of a specific micro-mechanic stays a hypothesis until the future deep `.dem` mode.

## Proposed runtime analysis process

1. Obtain the `match_id` and the user's identifier: `account_id`, hero or player slot.
2. Load the OpenDota match and check the parse not by the presence of `players` but by `version`, the replay URL and the required replay-derived arrays (`gold_t`, `xp_t`, `lh_t`, `teamfights` and the logs).
3. If the parse is missing, send `POST /request/{match_id}`, wait for the job to reach a terminal state and load the match again. On an unavailable replay or a timeout, switch to an explicitly marked degraded mode.
4. Determine the exact sub-patch from `start_time` and the Valve timeline.
5. If it is not the latest current sub-patch, stop the v0 analysis with `unsupported_patch` instead of applying current mechanics to an old match.
6. Determine the mode, the hero, the estimated position and the rank bracket; ask for clarification when the identification is ambiguous.
7. Build the evidence over time stretches, not only from the final table.
8. Compare against the self-baseline first, and only then against the hero, rank and role baseline.
9. Verify the required rules and mechanics of the current sub-patch.
10. Fill in the four stage cards per the adapted replay-review template.
11. Pick one turning point and one recurring pattern by impact and by evidence.
12. For every conclusion return the evidence, the expectation, the interpretation, the confidence and an alternative; finish with one training action.

## Sources not to rely on as a runtime foundation

- the model's own knowledge without checking the date and the patch;
- the old Fandom Dota 2 Wiki;
- random guides and videos with no patch marking;
- scraping Dotabuff: the service has no documented public API;
- Dota2ProTracker: excluded from the runtime chain after STRATZ was chosen as the direct role source;
- item win rates that ignore purchase time and selection bias;
- pro statistics alone for judging an average-rating player;
- current hero numbers for analysing a match on an old sub-patch.

## How to test the quality of the future skill

The minimal set:

1. a bad match with a mistake the user already knows about;
2. a good match, where the skill must not invent a problem;
3. an ambiguous match, where the conclusion must be cautious;
4. where possible, an independent review of one match by a strong player.

The criterion of success is not matching wording but finding a real, proven and fixable problem.

## A historical hook for a future video

The fact is confirmed by primary OpenAI sources:

- [OpenAI Five lost two matches at The International 2018](https://openai.com/index/the-international-2018-results/).
- [On 13 April 2019, OpenAI Five beat the reigning world champions OG in two games in a row](https://openai.com/index/openai-five-defeats-dota-2-world-champions/).

The story can be kept for a video, but it does not affect the skill's MVP.

## TDD check on the shape of the answer

Five independent baseline reviews written without the skill all found the Earth Spirit drop at `10-25`, but each added unproven causality: lost runes, a passive mid, TA farming freely, mandatory smokes, or a specific plan through Vessel. That set the skill's central rule: aggregates localize a weak stretch, but the cause must be confirmed by event data or labelled a hypothesis.

Separate baseline tests already correctly distinguished position 2 from support baselines and refused to confirm a specific missed creep without a creep timeline. Those behaviours need no extra prohibition; they must be preserved by the structure of the sources and by the insufficient-data field.

The first GREEN version still turned aggregates into generic advice about rotations, smokes and pressure. After the data sufficiency gates and a separate `aggregate-only` form were introduced, five final independent runs localized the `10-25` window, explicitly separated it from a diagnosis of behaviour, and offered decision annotation instead of an invented in-game norm. Additional edge tests did not mix position 2 with a support baseline and refused to explain a specific missed ranged creep without creep entities, HP and events. One early run mislabelled the XPM extreme; that is why the contract now requires checking the comparison rows before the words max and min.

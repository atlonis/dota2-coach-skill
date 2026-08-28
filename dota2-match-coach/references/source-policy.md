# Source policy

## Quick route

| Task | Primary source | Check and limit |
|---|---|---|
| Match facts and the parse job | OpenDota API | A basic scoreboard does not mean the replay is parsed |
| Position 1-5, lane outcome, playback and the peer baseline | STRATZ GraphQL | Token; exact `User-Agent: STRATZ_API` |
| The exact current sub-patch and its numbers | Valve patch timeline, patch notes and Datafeed | Datafeed is undocumented and needs schema validation |
| Explaining mechanics | Liquipedia | Verify current numbers against Valve |
| Strong players and builds | STRATZ hero leaderboard and recent matches | Filter by `IMMORTAL`, the same position and the current patch |
| An extra check on the player | OpenDota hero ranking and player matches | Hero ranking is not split by position |

Do not use Dota2ProTracker, the old Dota 2 Fandom or `GetMatchDetails` as runtime sources.

## Parse first

1. Fetch `GET https://api.opendota.com/api/matches/{match_id}`.
2. Check not only `players` but also `version`, the replay URL and the replay-derived arrays you need: `gold_t`, `xp_t`, `lh_t`, purchases, events and teamfights.
3. If they are missing, send `POST https://api.opendota.com/api/request/{match_id}`.
4. Wait for the job to reach a terminal state and fetch the match again.
5. If the replay is unavailable, keep the basic scoreboard already received as usable OpenDota evidence, record the parse state and error separately, switch to degraded mode and list the conclusions that are now unavailable.

STRATZ may return only basic data while its own replay is not parsed. Never read missing playback as zero actions.

## Selecting the player

With an `account_id`, select the player by it. When the user reviews someone else's match and named only a hero, resolve the exact English name through OpenDota `constants/heroes`, then find the single participant with the matching `hero_id` or `heroId`. Do not guess abbreviations such as `ES`: they are ambiguous. With two matches, a hidden account ID, or a conflict between the hero and an explicitly given `account_id`, stop with a safe diagnostic and ask for clarification.

## The exact patch

An OpenDota patch ID may denote only a family such as `7.41`. Determine the lettered sub-patch from `start_time` and the last Valve patch timeline entry published no later than the start of the match. The first version supports only the latest current sub-patch: an older exact patch returns `unsupported_patch`, an unavailable or unverified timeline returns `patch_unverified`; both paths exit with a non-zero code and no success artifact.

## STRATZ

Requests go to `https://api.stratz.com/graphql` with:

```text
Authorization: Bearer <STRATZ_API_KEY>
User-Agent: STRATZ_API
Content-Type: application/json
```

Never print or store the token. The current runtime requests:

- `match.players`: hero, position, lane, role, IMP;
- lane outcomes and final player stats;
- `playbackData`: ability and item uses, positions, kills, deaths, assists, successful CS, purchases and runes.

`heroStats.stats` is requested separately and gives the peer baseline: the `heroIds`, `positionIds`, `bracketBasicIds` and `week` filters, while `groupByTime` returns a cumulative curve over minutes 0-75 with a `matchCount` at each minute. This field has no patch filter — the patch is approximated by selecting weeks. `leaderboard.hero` for a sample of strong players is still not requested.

IMP is a closed model metric and an auxiliary signal. It does not prove a specific mistake. Never call `predictedOutcomeWeight` or any other undocumented field a draft edge percentage.

## Draft context

Assess three independent signals on different foundations:

1. `lane_expectation`: a sample of the same matchup, the exact patch, the positions and a close bracket; without a sample it is `insufficient_data`. Mechanics explain but do not replace a statistical footing.
2. `team_fit`: the full draft plus verified current mechanics. Walk the capability checklist: initiation, control, save, frontline, physical and magical damage, tower and objective pressure, wave clear, scaling and ways to continue a fight. This is a qualitative coaching interpretation, not a win probability.
3. `draft_prior`: only a documented model with a known output field, a relevant sample and an interpretation. Without one it is `insufficient_data`.

Show `favorable`, `even`, `unfavorable` or `insufficient_data`, what it stands on, the sample size and the confidence. Never mix the expected matchup with the actual lane outcome, and never turn `team_fit` into an undocumented edge percentage.

## Baseline

Order of comparison:

1. the same player on the same hero and position — **not implemented**;
2. the same hero + position + bracket + patch — **implemented** through STRATZ `heroStats.stats`;
3. strong STRATZ players on the same hero + position + patch — **not implemented**;
4. broader OpenDota benchmarks as a weak reference — **not implemented**.

Only the second level is implemented, and it opens `baseline_ready`. What it honestly gives and does not give:

- gives: the mean over a sample of the same hero, position and bracket across the weeks of the current patch, with the sample size at every compared minute;
- does not give: the player's percentile, a bucket finer than four, a game-mode filter, or a split by lane matchup, item components or power-spike timing;
- chooses the bucket by the player's own medal (OpenDota `rank_tier` and STRATZ `steamAccount.seasonRank`); the match average bracket stays the fallback and is named explicitly in the artifact;
- does not compare net worth: the player's per-minute row is comparable only with OpenDota accumulated gold, not with `networth`, and such a comparison inflates the player.

A single match is compared against a mean, so the conclusion reads as "above or below the sample mean by this ratio", not as a place in a distribution. A deviation from the mean localizes a divergence; the cause still requires events.

Do not copy a pro build mechanically. Compare the starting items, the order of components, the timings and the adaptation to the ten heroes on the map.

## Available micro signals

Runtime v1 can analyse confirmed ability uses, successful last hits by ability, positions, items and runes. It does not yet receive a full row of mana and health windows. Success-only events do not show every missed opportunity. Without a raw `.dem`, never claim why a specific creep was missed or why a specific input was or was not pressed.

## Trust hierarchy

1. Current numbers and changes: Valve.
2. Facts of an episode: the parsed replay, then OpenDota and STRATZ.
3. Mechanics: Liquipedia with a cross-check.
4. Expectations: a relevant statistical sample.
5. Strategy: a labelled coaching interpretation.

On a conflict, name the divergence and lower the confidence.

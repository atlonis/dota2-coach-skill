# Decision stack

Choose **one** main finding after checking warnings, capabilities and nulls. It decides the episode, the advice and the drill together.

1. **Answer the request.** A focused question (lane, items, deaths, farm, draft, progress) picks evidence on that topic, even when other signals are louder. If the topic lacks evidence, say so and make the drill collect it.
2. **Keep only supported candidates.** Timed deaths and their patterns, lane numbers against the opponents, all-player item timings, peer means, OpenDota percentiles, team-economy swings, objectives, wards, validated progress. Drop anything that needs an unavailable capability.
3. **Prefer what the player can change next game.** Among supported candidates, pick the one with the clearest next-game drill and the largest recorded cost: deaths that cost gold and time dead, a lane lost by a wide margin at 10:00, a key item far behind the enemy cores'. Use the playbook's position priorities to judge what matters for this role.
4. **Break ties by evidence coverage, then by recurrence.** Explain the choice in one clause in the main finding.

The runtime's death pattern and priority death are candidates, not instructions. You may group deaths yourself by recorded facts (killer, inside or outside a big fight, phase, gold lost, seconds dead) and choose the group with the largest recorded cost: "7 deaths after 50:00 outside big fights, 499–663 gold each" can outrank "dying first in fights" when it cost more. Such a group is a count of facts; a hypothesis about why still needs the hypothesis rule.

Typical strong findings by role (from the playbook, still needing this match's facts):

| Role | Usually worth checking first |
|---|---|
| 1 carry | last hits at 10:00 against the lane opponents, key item timing against the enemy carry, deaths after the lane |
| 2 mid | the mid matchup at 10:00, deaths to ganks before 10:00, kills against farm |
| 3 offlane | deaths in lane, recovery after a lost lane, deaths as the first in fights |
| 4 soft support | the lane ally's 10:00 numbers, deaths outside fights, roaming flag with the lane result |
| 5 hard support | ward placements, the safe-lane core's 10:00 numbers, dying first in fights |

A repeated death pattern shows recurrence, not by itself a reason. A team-economy swing locates a change, not its cause. A percentile is context, not a target. When nothing supports a coaching point, give a short factual review and one drill that gathers the missing evidence.

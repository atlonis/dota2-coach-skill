# Real OpenDota responses

Gzipped `/api/matches/{id}` and `/api/players/{id}/recentMatches` responses for 7.41f matches, fetched on 2026-10-19, used by `test/runtime/real-opendota.test.mjs`, `audit-regressions.test.mjs`, `check-review.test.mjs` and `recent-matches.test.mjs`.

| File | What it covers |
| --- | --- |
| `match-9048031561-parsed.json.gz` | a parsed ranked match; the README account (56386500) plays Skywrath Mage on Dire, slot 8; four deaths before the horn; the Ancient falls at the recorded duration |
| `match-9031156251-turbo.json.gz` | a parsed Turbo match; the Ancient is logged one second after the duration |
| `match-9047976816-unparsed.json.gz` | the same account's match before OpenDota parsed it: scoreboard and benchmarks only |
| `match-9052083664-abandon.json.gz` | a parsed Turbo match with an abandon (leaver status 2) |
| `recent-56386500.json.gz` | the README account's recent matches |
| `constants-heroes-items.json.gz` | `/constants/heroes` and `/constants/items`, reduced to id, names and cost |

To keep them small and free of other people's data, fields no runtime path reads (chat, cosmetics, word counts, persona names, per-player damage and ability breakdowns) were dropped, and every account ID except 56386500 was replaced by `900000 + slot`. Everything the runtime reads is as OpenDota returned it.

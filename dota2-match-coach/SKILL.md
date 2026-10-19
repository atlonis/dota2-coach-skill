---
name: dota2-match-coach
description: Use when a user asks for a Dota 2 post-match review on the current patch, by match ID, match link or "my last game", with an account ID, Steam/Dotabuff/OpenDota profile, hero name or slot; a focused review of lane, deaths, items, farm or draft; or progress across saved reviews.
---

# Dota 2 Match Coach

Review one current-patch match the way a coach would: **one main problem → the moment or number that shows it → coach's advice → one thing to practise next game.** Facts come only from the runtime artifact. Advice is welcome, and is always labelled as advice. Matches from earlier patches are out of scope, now and later.

## 1. Find the match and the player

- **Match:** a match ID or a Dotabuff/OpenDota/STRATZ match link. Without one, list recent matches and take the newest on the current patch (ask only when the user's words don't decide):
  `node scripts/recent-matches.mjs --account-id <ID | Steam64 | profile link>`
- **Player:** `--account-id` (a friend ID, Steam64 ID or Dotabuff/OpenDota/STRATZ/Steam profile link), or `--hero "<exact English name>"`, or `--slot 0-9` (0–4 Radiant, 5–9 Dire). A hero or slot works even when the player hides their account. A custom Steam profile URL (`/id/<name>`) cannot be resolved: ask for the numeric ID or a Dotabuff link.

## 2. Run the runtime (from the skill root)

```sh
node scripts/analyze-match.mjs --match-id <ID or link> --account-id <ID or link> --output-dir ./output
```

- An unparsed match takes up to 2–4 minutes while OpenDota parses the replay. **Run it in the background or with a command timeout of at least 300000 ms**; a 120-second default kills it before the artifact is written.
- Read stdout. A `hint:` line says what to do. If the replay is still parsing, tell the player in one line and offer a short scoreboard-only review now or a full one after a rerun in 5–10 minutes.
- On failure stderr has `error: <code>` and a `hint:`; tell the player the hint in plain words. Codes and artifact fields: [runtime](references/runtime.md).
- Optional keys, set in the environment and never asked for in chat: `STRATZ_API_KEY` (positions, item and ability uses, peer means), `OPENDOTA_API_KEY` (higher rate limit).

## 3. Read the evidence

Open the JSON artifact (the facts) and skim the evidence Markdown next to it. Check `warnings`, `dataQuality.capabilities` and source status first. Then read:

- always: [review template](references/review-template.md), [source policy](references/source-policy.md), [coaching playbook](references/coaching-playbook.md);
- when deaths are in scope: [death analysis](references/death-analysis.md);
- when several findings compete: [decision stack](references/decision-stack.md);
- only when the user asks about progress or passes a history directory: [progress](references/progress.md);
- for a model of the finished answer: [examples](references/examples.md).

## 4. Write the review

Pick the mode from the request: **full** by default, **brief** for a short answer, **focused** for a named topic. Follow the review template. Write in the user's language; in Russian, use the players' vocabulary from the playbook. Use "you" only when the user said the match is theirs; otherwise "the player on <Hero>".

## 5. Check before sending

Save the draft to a temporary file and run:

```sh
node scripts/check-review.mjs --artifact ./output/<match>.json --review <draft.md> --mode <full|brief|focused>
```

Pass the mode you chose (a short request about one topic is `brief`). Fix every reported problem (a timecode not in the artifact, an internal field name, a missing section, a length over the limit) and consider every note, then apply the final audit in the review template.

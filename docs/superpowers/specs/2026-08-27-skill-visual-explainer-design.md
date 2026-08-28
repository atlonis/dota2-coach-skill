# Visual explainer for Dota 2 Match Coach

## Goal

Build a Russian-language presentation site for the technical part of the video. The site does not sell the skill and does not retell the whole video: it visually explains what a Codex skill is, how `dota2-match-coach` collects data, how it constrains its conclusions, and what review it produces.

The main usage scenario is the author opening the site while recording, or using its screens as material for the edit.

## Format

- One responsive static site with vertical scrollytelling.
- Five full-screen meaningful sections.
- Navigation by scroll, mouse wheel and keyboard.
- Every screen must read as a self-contained 16:9 video frame.
- The interface and content language is Russian.
- Visual system: a light paper background, large black editorial typography, red meaningful accents, thin technical lines and diagrams.
- Minimal running text; the priority is diagrams, source cards, statuses and real field names.

## Structure

### 1. What a skill is

Show a skill as a reproducible system rather than one large prompt:

`instructions + runtime + source policy + review template`.

The central idea: the model does not start with an opinion — first it collects and verifies the evidence of the match.

### 2. The path of one request

The main animated diagram:

`match_id + account_id or hero -> player selection -> source collection -> normalized evidence -> data gates -> the coaching review`.

The diagram must separately show OpenDota parse-first behaviour and degraded mode: when part of the replay data is unavailable, the skill continues with confirmed facts only.

### 3. Data sources

Four cards with different roles:

- **OpenDota** — the basic match facts, the scoreboard, the parse job, the time series and the replay-derived events after parsing.
- **STRATZ GraphQL** — positions 1-5, lane outcome, the full draft and playback enrichment. Requires `STRATZ_API_KEY` and the `User-Agent: STRATZ_API` header.
- **Valve** — the exact current sub-patch, the patch timeline and the current numeric changes. The Datafeed is used only after a schema check.
- **Liquipedia** — explanation of the current mechanics; numeric values are verified against Valve. This is a reference, not a match API.

OpenDota and STRATZ are shown as sources of match facts; Valve and Liquipedia as sources of context. Dota2ProTracker, the old Fandom and Valve `GetMatchDetails` are not depicted as runtime dependencies.

### 4. Data gates: when a conclusion is allowed

Show the evidence gates:

- `scoreboard` — the result and the match line;
- `phase_aggregates` — comparison of stages inside the match;
- `draft_ready` — the full draft and the draft context;
- `event_ready` — the timeline and analysis of a specific episode;
- `baseline_ready` — comparison against a relevant sample;
- `current_patch` — a confirmed current sub-patch.

An open gate is highlighted red; a closed one stays grey and blocks the corresponding kind of claim. The key formula of the screen: no data is not the same as zero actions.

### 5. What the user gets

Show the structure of the final coaching review:

- four stages of the game;
- the context of role, lane and draft;
- items and key decisions;
- the main window where the game could have been changed;
- for every important claim: `fact -> expectation -> interpretation -> confidence -> alternative`.

At the bottom, a compact honest roadmap of three points:

1. a statistical draft advantage model;
2. a baseline by role, rating, patch and strong players;
3. a raw `.dem` for deep micro-mechanics analysis.

The roadmap is visually separated from the capabilities that already work.

## Interaction and motion

- Calm transitions between sections, with no decorative animation for its own sake.
- Inside diagrams, elements appear in sequence along the direction of the data flow.
- Source cards reveal short details on tap or hover.
- An `01-05` indicator makes the site usable as a presentation.
- `prefers-reduced-motion` is supported.

## Content accuracy

- Do not attribute to the current runtime an automatic baseline, the STRATZ leaderboard or a statistical draft model.
- Do not promise an explanation of a specific missed creep or a wrong input without a raw `.dem`.
- Do not show a model win percentage without a documented and calibrated model.
- Describe STRATZ as enrichment: without the token, a limited OpenDota review is still possible.
- Distinguish confirmed facts, expectations and coaching interpretation.

## Technical form

The site is built through Sites as a separate frontend inside the repository. It does not call the Dota APIs from the browser and stores no tokens: everything on the screens is prepared safe examples reflecting the contract of the skill. That keeps the visuals reproducible for recording and independent of the network or the parse state of a specific match.

## Verification

- Check desktop 16:9 as the main frame for the video.
- Check the mobile layout with no horizontal scrolling.
- Check keyboard navigation, focus and reduced motion.
- Reconcile every source, gate and roadmap caption with `dota2-match-coach/references/source-policy.md`, `dota2-match-coach/references/runtime.md` and `ROADMAP.md`.
- Confirm the site carries no advertising CTAs, no installation, no personal story and none of the other parts of the video script.

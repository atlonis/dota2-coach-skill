# Skill Visual Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Russian five-screen editorial website that visually explains how `dota2-match-coach` gathers, validates, and turns match data into a coaching review.

**Architecture:** A dependency-free static frontend lives in `site/`: semantic HTML owns the five-screen narrative, CSS owns the responsive editorial visual system and motion, and a small JavaScript module owns keyboard/scroll navigation, progress state, source-card disclosure, and staged diagram reveals. Node's built-in test runner validates content accuracy and interaction contracts; the Sites workflow provides the final local preview and hosting metadata without adding browser-side API calls.

**Tech Stack:** HTML5, CSS, vanilla ES modules, Node.js 18+ built-in test runner, Sites.

**Spec:** `docs/superpowers/specs/2026-08-27-skill-visual-explainer-design.md`

## Global Constraints

- The site is Russian-only and contains exactly five full-screen narrative sections.
- The visual system uses a light paper background, bold black editorial typography, red semantic accents, and restrained technical diagrams.
- No runtime Dota API request, API token, installation CTA, sales copy, personal story, competitor section, or unrelated video material may appear.
- STRATZ is enrichment that requires `STRATZ_API_KEY`; OpenDota-only degraded analysis remains possible.
- Statistical draft advantage, role/rank/patch baseline, strong-player leaderboard collection, and raw `.dem` micro-analysis must be labelled roadmap, not current functionality.
- Desktop 16:9 is the primary presentation surface; mobile, keyboard navigation, visible focus, and `prefers-reduced-motion` must remain usable.

---

### Task 1: Static narrative and content contract

**Files:**
- Create: `site/index.html`
- Create: `site/content.mjs`
- Create: `site/test/content.test.mjs`

**Interfaces:**
- Consumes: Source and gate terminology from the design spec and `dota2-match-coach/references/*.md`.
- Produces: `slides`, `sources`, `gates`, and `roadmap` named exports; DOM sections with IDs `skill`, `flow`, `sources`, `gates`, and `output`.

- [ ] **Step 1: Write the failing content contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { slides, sources, gates, roadmap } from '../content.mjs';

test('the explainer contains five technical screens and accurate source roles', async () => {
  assert.deepEqual(slides.map(({ id }) => id), ['skill', 'flow', 'sources', 'gates', 'output']);
  assert.deepEqual(sources.map(({ name }) => name), ['OpenDota', 'STRATZ GraphQL', 'Valve', 'Liquipedia']);
  assert.equal(gates.length, 6);
  assert.deepEqual(roadmap.map(({ id }) => id), ['draft-model', 'baseline', 'raw-dem']);

  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const { id } of slides) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /купить|установить сейчас|Dota2ProTracker|Fandom/i); // the site copy is Russian by design
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test site/test/content.test.mjs`

Expected: FAIL because `site/content.mjs` and `site/index.html` do not exist.

- [ ] **Step 3: Create the content model and semantic five-screen HTML**

`content.mjs` exports stable data used by tests and the UI:

```js
export const slides = [
  { id: 'skill', number: '01', label: 'Что такое skill' },
  { id: 'flow', number: '02', label: 'Путь запроса' },
  { id: 'sources', number: '03', label: 'Источники' },
  { id: 'gates', number: '04', label: 'Data gates' },
  { id: 'output', number: '05', label: 'Результат' },
];

export const sources = [
  { name: 'OpenDota', role: 'Факты матча и parse-first', kind: 'match' },
  { name: 'STRATZ GraphQL', role: 'Позиции, линия и playback', kind: 'match' },
  { name: 'Valve', role: 'Точный текущий патч', kind: 'context' },
  { name: 'Liquipedia', role: 'Объяснение механик', kind: 'context' },
];

export const gates = ['scoreboard', 'phase_aggregates', 'draft_ready', 'event_ready', 'baseline_ready', 'current_patch'];
export const roadmap = [
  { id: 'draft-model', label: 'Статистическая модель драфта' },
  { id: 'baseline', label: 'Baseline по роли, рейтингу и патчу' },
  { id: 'raw-dem', label: 'Сырой .dem и микромеханики' },
];
```

`index.html` contains a skip link, a fixed `01—05` progress/navigation element, one `<main>` with five labelled `<section>` elements, source disclosure buttons, a gate board, a coaching-output composition, and the compact roadmap. Every icon-like decoration is either text, CSS, or inline SVG with correct `aria-hidden` handling.

- [ ] **Step 4: Run the content test and verify it passes**

Run: `node --test site/test/content.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the narrative foundation**

```bash
git add site/index.html site/content.mjs site/test/content.test.mjs
git commit -m "feat: add skill explainer narrative"
```

### Task 2: Editorial visual system and responsive presentation layout

**Files:**
- Create: `site/styles.css`
- Modify: `site/index.html`
- Create: `site/test/layout.test.mjs`

**Interfaces:**
- Consumes: The five semantic section IDs and structural class names from Task 1.
- Produces: CSS custom properties, `.screen`, `.flow-map`, `.source-grid`, `.gate-board`, `.review-stack`, `.roadmap`, responsive breakpoints, focus styles, and reduced-motion overrides.

- [ ] **Step 1: Write the failing layout contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the stylesheet implements the editorial presentation and accessibility contracts', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /--paper\s*:/);
  assert.match(css, /--ink\s*:/);
  assert.match(css, /--accent\s*:/);
  assert.match(css, /min-height:\s*100(?:dvh|svh)/);
  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /overflow-x:\s*(?:scroll|auto)/);
});
```

- [ ] **Step 2: Run the layout test and verify it fails**

Run: `node --test site/test/layout.test.mjs`

Expected: FAIL because `site/styles.css` does not exist.

- [ ] **Step 3: Implement the responsive editorial design**

Define warm paper/ink/red tokens, a locally available system font stack, fluid `clamp()` typography, five viewport-height screens, asymmetric desktop grids suited to 16:9 capture, clear section numbering, technical connectors, red active states, and black/grey inactive states. Add a single-column mobile layout, touch-safe disclosure buttons, `:focus-visible` outlines, and a reduced-motion block that disables transforms, smooth scrolling, and reveal transitions.

- [ ] **Step 4: Run the content and layout tests**

Run: `node --test site/test/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the visual system**

```bash
git add site/index.html site/styles.css site/test/layout.test.mjs
git commit -m "feat: style editorial skill explainer"
```

### Task 3: Presentation navigation and diagram interactions

**Files:**
- Create: `site/app.mjs`
- Modify: `site/index.html`
- Create: `site/test/interaction.test.mjs`

**Interfaces:**
- Consumes: `slides` from `content.mjs`, `[data-screen]` sections, `[data-source-toggle]` disclosure controls, and the fixed progress element.
- Produces: `clampSlide(index, count)`, `slideFromKey(key, current, count)`, `setActiveSlide(index)`, source-card expanded states, and `data-visible` reveal states.

- [ ] **Step 1: Write failing pure interaction tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { clampSlide, slideFromKey } from '../app.mjs';

test('keyboard navigation stays inside the five-screen story', () => {
  assert.equal(clampSlide(-1, 5), 0);
  assert.equal(clampSlide(5, 5), 4);
  assert.equal(slideFromKey('ArrowDown', 1, 5), 2);
  assert.equal(slideFromKey('PageUp', 1, 5), 0);
  assert.equal(slideFromKey('Home', 3, 5), 0);
  assert.equal(slideFromKey('End', 1, 5), 4);
  assert.equal(slideFromKey('x', 1, 5), 1);
});
```

- [ ] **Step 2: Run the interaction test and verify it fails**

Run: `node --test site/test/interaction.test.mjs`

Expected: FAIL because `site/app.mjs` does not exist.

- [ ] **Step 3: Implement navigation, progress, disclosures, and reveals**

Export the two pure navigation helpers before browser initialization. In the browser, use `IntersectionObserver` to update the active `01—05` marker and reveal diagram steps. Handle `ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, and `End` only when focus is not inside an interactive control. Use `scrollIntoView()` with instant behavior when reduced motion is preferred. Keep source buttons as native accessible disclosure controls with synchronized `aria-expanded` state.

- [ ] **Step 4: Run all site tests**

Run: `node --test site/test/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit interactions**

```bash
git add site/index.html site/app.mjs site/test/interaction.test.mjs
git commit -m "feat: add explainer presentation controls"
```

### Task 4: Sites integration and visual verification

**Files:**
- Create or modify as required by Sites: `.openai/hosting.json`
- Create: `site/README.md`
- Modify: root `README.md`
- Modify: root `README.ru.md`

**Interfaces:**
- Consumes: The complete dependency-free static site from Tasks 1–3.
- Produces: A Sites-compatible project entry, documented preview path, and verified desktop/mobile presentation.

- [ ] **Step 1: Add a repository-level verification test**

Extend `site/test/content.test.mjs` to assert that `index.html` references `styles.css` and `app.mjs`, all local referenced files exist, and the root Russian README links to `site/README.md`.

- [ ] **Step 2: Run the verification test and confirm the documentation assertion fails**

Run: `node --test site/test/content.test.mjs`

Expected: FAIL because the site README and root README link do not exist yet.

- [ ] **Step 3: Integrate with Sites and document the visual artifact**

Use the `sites:sites-building` workflow to create the required hosting metadata for the static `site/` entry. Add a short `site/README.md` describing the five presentation screens and a link from both root READMEs, under a `Visual explainer` heading in the English README and a `Визуальный explainer` heading in the Russian one. Do not add installation or sales copy to the site itself.

- [ ] **Step 4: Verify code, content, and rendering**

Run: `node --test site/test/*.test.mjs`

Expected: all site tests PASS.

Open the Sites preview and verify at a 16:9 desktop viewport and a narrow mobile viewport: all five sections fit without horizontal scrolling, keyboard navigation changes the active marker, disclosures work, focus remains visible, reduced-motion styles exist, and roadmap labels are visually distinct from current capabilities.

- [ ] **Step 5: Commit the Sites artifact**

```bash
git add .openai/hosting.json site/README.md README.md README.ru.md site
git commit -m "feat: add Sites visual explainer"
```


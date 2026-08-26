# Match Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform, zero-package Node.js runtime that fetches OpenDota and STRATZ match evidence, normalizes it, and produces JSON/Markdown inputs for the «Выше контекста» review.

**Architecture:** Thin `.sh` and `.ps1` wrappers invoke a shared Node.js ESM CLI. Focused source clients feed a provenance-preserving normalizer; a deterministic renderer writes atomic JSON and Markdown artifacts. Source failures degrade data gates instead of inventing missing context.

**Tech Stack:** Node.js 18+ ESM, built-in `fetch`, `node:test`, `node:fs/promises`; POSIX `sh`; PowerShell 7/Windows PowerShell; no npm packages.

**Spec:** `docs/superpowers/specs/2026-08-25-match-runtime-design.md`

## Global Constraints

- Node.js 18+ is the only shared runtime dependency; do not add `package.json` dependencies.
- macOS/Linux use `scripts/analyze-match.sh`; Windows uses `scripts/analyze-match.ps1`; both delegate to the same `.mjs` CLI.
- STRATZ requests use `Authorization: Bearer <STRATZ_API_KEY>` and exact `User-Agent: STRATZ_API`; never log either header.
- Do not persist raw API responses or secrets.
- OpenDota is parse-first; partial source failure produces explicit degraded output.
- Runtime supports only the latest exact Dota 2 subpatch; an unverified patch closes normative gates.
- Raw `.dem` parsing and creep/input reconstruction remain out of scope.
- This workspace is not a git repository. Do not initialize one; replace commit steps with explicit verification checkpoints.

## File Map

- Create `dota2-match-coach/scripts/lib/http.mjs`: safe JSON HTTP, timeout, rate-limit and error normalization.
- Create `dota2-match-coach/scripts/lib/opendota.mjs`: match load, parse-state, parse request and job polling.
- Create `dota2-match-coach/scripts/lib/stratz.mjs`: tested GraphQL query and enrichment contract.
- Create `dota2-match-coach/scripts/lib/valve.mjs`: exact current-subpatch resolution from Valve's official timeline.
- Create `dota2-match-coach/scripts/lib/normalize.mjs`: canonical evidence model, phase deltas, extrema and gates.
- Create `dota2-match-coach/scripts/lib/report.mjs`: deterministic Markdown and atomic artifact writes.
- Create `dota2-match-coach/scripts/analyze-match.mjs`: CLI parsing and orchestration.
- Create `dota2-match-coach/scripts/analyze-match.sh`: POSIX wrapper.
- Create `dota2-match-coach/scripts/analyze-match.ps1`: PowerShell wrapper.
- Create `dota2-match-coach/test/runtime/*.test.mjs`: offline unit and orchestration tests.
- Create `dota2-match-coach/references/runtime.md`: commands, schema and troubleshooting.
- Modify `dota2-match-coach/SKILL.md`: require runtime for match-ID analysis.
- Modify `dota2-match-coach/references/source-policy.md`: source status and degraded-mode contract.

---

### Task 1: Safe HTTP and OpenDota parse-first client

**Files:**
- Create: `dota2-match-coach/test/runtime/opendota.test.mjs`
- Create: `dota2-match-coach/scripts/lib/http.mjs`
- Create: `dota2-match-coach/scripts/lib/opendota.mjs`

**Interfaces:**
- Produces: `requestJson(url, options) -> Promise<{ ok, status, data, headers }>` or throws `SourceError`.
- Produces: `hasReplayData(match) -> boolean`.
- Produces: `createOpenDotaClient({ fetchImpl, sleep, baseUrl }).loadMatch(matchId, options) -> Promise<OpenDotaResult>`.
- `OpenDotaResult`: `{ status: 'ready'|'not_found'|'failed', match, parse: { requested, state, jobId }, error? }`.

- [ ] **Step 1: Write failing OpenDota tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenDotaClient, hasReplayData } from '../../scripts/lib/opendota.mjs';

test('parsed state requires version and replay-derived player series', () => {
  assert.equal(hasReplayData({ version: 22, players: [{ gold_t: [0, 100] }] }), true);
  assert.equal(hasReplayData({ players: [{ kills: 4 }] }), false);
});

test('requests parse, polls job, then reloads the match', async () => {
  const calls = [];
  const replies = [
    { players: [{ account_id: 7 }] },
    { job: { jobId: 'job-1' } },
    { state: 'completed' },
    { version: 22, players: [{ account_id: 7, gold_t: [0, 100] }] },
  ];
  const fetchImpl = async (url, options = {}) => {
    calls.push([url, options.method ?? 'GET']);
    return new Response(JSON.stringify(replies.shift()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = createOpenDotaClient({ fetchImpl, sleep: async () => {} });
  const result = await client.loadMatch(123, { parseTimeoutMs: 1000, pollIntervalMs: 1 });
  assert.equal(result.status, 'ready');
  assert.equal(result.parse.state, 'completed');
  assert.deepEqual(calls.map(([, method]) => method), ['GET', 'POST', 'GET', 'GET']);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test dota2-match-coach/test/runtime/opendota.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/opendota.mjs`.

- [ ] **Step 3: Implement safe HTTP and parse-first behavior**

```js
// http.mjs
export class SourceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
    this.details = details;
  }
}

export async function requestJson(url, { fetchImpl = fetch, timeoutMs = 15_000, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      const code = response.status === 429 ? 'rate_limited'
        : response.status === 401 || response.status === 403 ? 'auth' : 'http';
      throw new SourceError(code, `HTTP ${response.status}`, { status: response.status });
    }
    if (!contentType.includes('json')) throw new SourceError('invalid_response', 'Expected JSON response');
    return { ok: true, status: response.status, data: await response.json(), headers: response.headers };
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError(error?.name === 'AbortError' ? 'timeout' : 'network', 'Request failed');
  } finally {
    clearTimeout(timer);
  }
}
```

```js
// opendota.mjs — terminal state recognition remains tolerant because the OpenAPI leaves job response untyped.
export function hasReplayData(match) {
  return Number.isInteger(match?.version) && (match.players ?? []).some((player) =>
    ['gold_t', 'xp_t', 'lh_t', 'hero_damage_t', 'purchase_log'].some((key) => Array.isArray(player?.[key])));
}
```

Implement `loadMatch` with exact endpoints `GET /matches/{matchId}`, `POST /request/{matchId}`, and `GET /request/{jobId}`. Accept `job.jobId`, `jobId`, or `id`; treat `completed`, `failed` and `error` as terminal; enforce the total parse timeout before each poll.

- [ ] **Step 4: Add failure cases and reach GREEN**

Add tests for match `404`, HTML response, `429`, parse timeout and unavailable job ID. Run:

`node --test dota2-match-coach/test/runtime/opendota.test.mjs`

Expected: all OpenDota tests PASS.

- [ ] **Step 5: Verification checkpoint**

Run separately:

```text
node --test dota2-match-coach/test/runtime/opendota.test.mjs
git -C . rev-parse --is-inside-work-tree
```

Expected: tests PASS; git reports that the workspace is not a repository. Record the test count in the task log; do not initialize git.

---

### Task 2: STRATZ GraphQL client with exact headers

**Files:**
- Create: `dota2-match-coach/test/runtime/stratz.test.mjs`
- Create: `dota2-match-coach/scripts/lib/stratz.mjs`

**Interfaces:**
- Produces: `createStratzClient({ apiKey, fetchImpl, endpoint }).loadMatch(matchId) -> Promise<StratzResult>`.
- `StratzResult`: `{ status: 'ready'|'unavailable'|'not_found'|'failed', match?, error? }`.
- Match query includes match metadata, ten players and selected player playback arrays.

- [ ] **Step 1: Write failing header and normalization tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStratzClient } from '../../scripts/lib/stratz.mjs';

test('sends exact STRATZ headers and returns match data', async () => {
  let captured;
  const fetchImpl = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ data: { match: { id: 123, players: [] } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await createStratzClient({ apiKey: 'secret', fetchImpl }).loadMatch(123);
  assert.equal(captured.headers['User-Agent'], 'STRATZ_API');
  assert.equal(captured.headers.Authorization, 'Bearer secret');
  assert.equal(result.status, 'ready');
});

test('does not call STRATZ without a token', async () => {
  const result = await createStratzClient({ apiKey: '' }).loadMatch(123);
  assert.deepEqual(result, { status: 'unavailable', reason: 'missing_token' });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test dota2-match-coach/test/runtime/stratz.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/stratz.mjs`.

- [ ] **Step 3: Implement the tested GraphQL query and client**

The query must use fields verified by live introspection on 25 August 2026:

```graphql
query MatchRuntime($matchId: Long!) {
  match(id: $matchId) {
    id didRadiantWin durationSeconds startDateTime gameVersionId
    gameMode lobbyType bracket rank radiantKills direKills
    topLaneOutcome midLaneOutcome bottomLaneOutcome
    pickBans { isPick heroId order bannedHeroId isRadiant playerIndex }
    players {
      steamAccountId heroId isRadiant position lane roleBasic
      kills deaths assists numLastHits numDenies goldPerMinute
      experiencePerMinute networth heroDamage towerDamage heroHealing imp
      item0Id item1Id item2Id item3Id item4Id item5Id
      playbackData {
        abilityUsedEvents { time abilityId }
        itemUsedEvents { time itemId }
        playerUpdatePositionEvents { time x y }
        killEvents { time target byAbility byItem positionX positionY isGank isSmoke }
        deathEvents { time attacker byAbility byItem positionX positionY timeDead isFeed }
        assistEvents { time target positionX positionY }
        csEvents { time npcId byAbility byItem gold xp positionX positionY isCreep isNeutral isAncient }
        purchaseEvents { time itemId }
        runeEvents { time rune action gold positionX positionY }
      }
    }
  }
}
```

If a selected field becomes invalid, return `failed/graphql` with the GraphQL messages redacted to field names; do not retry with a broader undocumented query.

- [ ] **Step 4: Add source failure cases and reach GREEN**

Add tests for GraphQL errors, HTML/Cloudflare, `401`, `403`, `429`, null match and malformed payload. Run:

`node --test dota2-match-coach/test/runtime/stratz.test.mjs`

Expected: all STRATZ tests PASS and no error object contains `secret`.

- [ ] **Step 5: Verification checkpoint**

Run: `node --test dota2-match-coach/test/runtime/stratz.test.mjs`

Expected: PASS. Record the count; no commit because the workspace has no `.git`.

---

### Task 3: Valve exact-subpatch resolver

**Files:**
- Create: `dota2-match-coach/test/runtime/valve.test.mjs`
- Create: `dota2-match-coach/scripts/lib/valve.mjs`

**Interfaces:**
- Produces: `createValveClient({ fetchImpl, endpoint }).resolvePatch(startTime) -> Promise<ValvePatchResult>`.
- `ValvePatchResult`: `{ status: 'ready', matchPatch, currentPatch, isCurrentExactPatch }` or `{ status: 'failed', error }`.

- [ ] **Step 1: Write failing timeline tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createValveClient } from '../../scripts/lib/valve.mjs';

test('resolves the match patch and exact current subpatch from timestamps', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    success: 1,
    patches: [
      { patch_number: '7.41d', patch_timestamp: 1780556400 },
      { patch_number: '7.41e', patch_timestamp: 1785394800 },
    ],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  const result = await createValveClient({ fetchImpl }).resolvePatch(1785400000);
  assert.deepEqual(result, {
    status: 'ready', matchPatch: '7.41e', currentPatch: '7.41e', isCurrentExactPatch: true,
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test dota2-match-coach/test/runtime/valve.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/valve.mjs`.

- [ ] **Step 3: Implement official timeline resolution**

Use `https://www.dota2.com/datafeed/patchnoteslist?language=english`. Validate `patches[]`, sort by numeric `patch_timestamp`, select the latest entry whose timestamp is at or before `startTime`, and treat the final timeline entry as the exact current subpatch.

```js
export function resolveTimeline(patches, startTime) {
  const ordered = patches
    .filter((patch) => typeof patch?.patch_number === 'string' && Number.isFinite(patch?.patch_timestamp))
    .sort((a, b) => a.patch_timestamp - b.patch_timestamp);
  const match = ordered.filter((patch) => patch.patch_timestamp <= startTime).at(-1) ?? null;
  const current = ordered.at(-1) ?? null;
  return {
    matchPatch: match?.patch_number ?? null,
    currentPatch: current?.patch_number ?? null,
    isCurrentExactPatch: Boolean(match && current && match.patch_number === current.patch_number),
  };
}
```

- [ ] **Step 4: Add failure and old-patch cases; reach GREEN**

Add tests for unsorted entries, timestamp before all known patches, invalid JSON, HTTP failure and a match on `7.41d` while current is `7.41e`.

Run: `node --test dota2-match-coach/test/runtime/valve.test.mjs`

Expected: all Valve tests PASS.

- [ ] **Step 5: Verification checkpoint**

Run the focused Valve test file and record the passing count. No commit because the workspace has no `.git`.

---

### Task 4: Provenance-preserving normalization and phase metrics

**Files:**
- Create: `dota2-match-coach/test/runtime/normalize.test.mjs`
- Create: `dota2-match-coach/scripts/lib/normalize.mjs`

**Interfaces:**
- Consumes: ready or degraded OpenDota/STRATZ/Valve results from Tasks 1–3.
- Produces: `normalizeEvidence({ matchId, accountId, openDota, stratz, valve, generatedAt }) -> EvidenceModel`.
- Produces: `buildPhases(player, stratzPlayer, durationSeconds) -> Phase[]`.
- Produces: `dataQualityFor(model) -> { mode, gates, missing, warnings }`.

- [ ] **Step 1: Write failing player, phase and gate tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvidence } from '../../scripts/lib/normalize.mjs';

test('finds account and computes cumulative-series deltas by phase', () => {
  const player = {
    account_id: 56386500, hero_id: 107, player_slot: 3,
    gold_t: [0, 100, 250], xp_t: [0, 120, 300], lh_t: [0, 1, 3],
    hero_damage_t: [0, 50, 170],
  };
  const model = normalizeEvidence({
    matchId: 1, accountId: 56386500, generatedAt: '2026-08-25T00:00:00.000Z',
    openDota: { status: 'ready', match: { duration: 120, players: [player] }, parse: { state: 'completed' } },
    stratz: { status: 'unavailable', reason: 'missing_token' },
  });
  assert.equal(model.player.heroId.value, 107);
  assert.equal(model.player.heroId.source, 'opendota');
  assert.equal(model.phases[0].metrics.gold, 250);
  assert.equal(model.dataQuality.mode, 'degraded');
});

test('preserves conflicting positions instead of silently choosing one', () => {
  const model = normalizeEvidence({
    matchId: 1, accountId: 56386500, generatedAt: '2026-08-25T00:00:00.000Z',
    openDota: {
      status: 'ready',
      match: { duration: 60, players: [{ account_id: 56386500, hero_id: 107, position_est: 2 }] },
      parse: { state: 'completed' },
    },
    stratz: {
      status: 'ready',
      match: { players: [{ steamAccountId: 56386500, heroId: 107, position: 'POSITION_4' }] },
    },
    valve: { status: 'failed', error: { code: 'network' } },
  });
  assert.equal(model.player.position.value, null);
  assert.match(model.dataQuality.warnings.join(' '), /position conflict/i);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test dota2-match-coach/test/runtime/normalize.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/normalize.mjs`.

- [ ] **Step 3: Implement canonical fields and phase boundaries**

Use exact boundaries `[0,600)`, `[600,900)`, `[900,1500)`, `[1500,duration]`. Derive gold, XP, LH, denies and hero damage as cumulative deltas divided by actual phase minutes. Count STRATZ kill/death/assist events whose `time` falls inside the same half-open interval.

```js
const PHASES = [
  { id: 'lane', start: 0, end: 600 },
  { id: 'transition', start: 600, end: 900 },
  { id: 'midgame', start: 900, end: 1500 },
  { id: 'closing', start: 1500, end: Infinity },
];

function sourced(value, source) {
  return { value: value ?? null, source: value == null ? null : source };
}
```

Gate rules:

- `scoreboard`: match/player summary exists;
- `phase_aggregates`: at least gold/xp/lh series or STRATZ timed events exist;
- `draft_ready`: ten distinct picked heroes are known;
- `event_ready`: timed deaths plus at least one of positions/fights/runes/ability uses exist;
- `baseline_ready`: remains false in this runtime version unless a same hero/position/rank/patch sample is explicitly present;
- `current_patch`: true only when current exact patch was verified.

- [ ] **Step 4: Add extrema, provenance and edge cases; reach GREEN**

Add tests for short matches, missing final minute, empty arrays, absent account, duplicate account, Radiant/Dire result, ten-hero draft completeness, extrema across four phases and one-phase ties. Extremum labels compare each metric independently and omit labels for missing values.

Run: `node --test dota2-match-coach/test/runtime/normalize.test.mjs`

Expected: all normalization tests PASS.

- [ ] **Step 5: Verification checkpoint**

Run: `node --test dota2-match-coach/test/runtime/normalize.test.mjs`

Expected: PASS. Save the test count in the plan execution notes.

---

### Task 5: Deterministic report and atomic artifacts

**Files:**
- Create: `dota2-match-coach/test/runtime/report.test.mjs`
- Create: `dota2-match-coach/scripts/lib/report.mjs`

**Interfaces:**
- Consumes: `EvidenceModel` from Task 4.
- Produces: `renderEvidenceMarkdown(model) -> string`.
- Produces: `writeArtifacts(model, outputDir) -> Promise<{ jsonPath, markdownPath }>`.

- [ ] **Step 1: Write failing evidence-boundary tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEvidenceMarkdown } from '../../scripts/lib/report.mjs';

test('aggregate-only report localizes metrics without inventing a cause', () => {
  const markdown = renderEvidenceMarkdown({
    request: { matchId: '1', accountId: 2 },
    sources: { opendota: { status: 'ready' }, stratz: { status: 'unavailable' } },
    phases: [{ id: 'midgame', interval: '15–25', metrics: { lhPerMin: 7.4, heroDamagePerMin: 348 }, extremaWithinMatch: ['lhPerMin:max', 'heroDamagePerMin:min'] }],
    dataQuality: { mode: 'degraded', gates: { phase_aggregates: true, event_ready: false }, missing: ['event timeline'], warnings: [] },
  });
  assert.match(markdown, /приоритет.*разбор/i);
  assert.match(markdown, /не диагноз/i);
  assert.doesNotMatch(markdown, /фармил вместо|потерял темп|обязан был ротировать/i);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test dota2-match-coach/test/runtime/report.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/report.mjs`.

- [ ] **Step 3: Implement the renderer and atomic writer**

Markdown sections are fixed: request, source statuses, match/player passport, draft/lane availability, phase fact table, event inventory, data gates, missing data and warnings. It does not produce the final LLM coaching narrative.

```js
export async function writeArtifacts(model, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const base = path.join(outputDir, String(model.request.matchId));
  const json = `${JSON.stringify(model, null, 2)}\n`;
  await atomicWrite(`${base}.json`, json);
  await atomicWrite(`${base}.md`, renderEvidenceMarkdown(model));
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}
```

- [ ] **Step 4: Add atomic-write and determinism cases; reach GREEN**

Use a temporary directory. Assert stable Markdown for the same model, valid JSON round-trip, both final files exist and no `.tmp-*` file remains after success.

Run: `node --test dota2-match-coach/test/runtime/report.test.mjs`

Expected: all report tests PASS.

- [ ] **Step 5: Verification checkpoint**

Run: `node --test dota2-match-coach/test/runtime/report.test.mjs`

Expected: PASS; no secret-like strings appear in fixture artifacts.

---

### Task 6: CLI orchestration and cross-platform wrappers

**Files:**
- Create: `dota2-match-coach/test/runtime/cli.test.mjs`
- Create: `dota2-match-coach/scripts/analyze-match.mjs`
- Create: `dota2-match-coach/scripts/analyze-match.sh`
- Create: `dota2-match-coach/scripts/analyze-match.ps1`

**Interfaces:**
- Consumes: source clients, normalizer and artifact writer from Tasks 1–5.
- Produces: `parseArgs(argv) -> CliOptions`.
- Produces: `runAnalysis(options, dependencies) -> Promise<{ model, artifacts }>`.
- CLI exit codes: `0` report created, `2` invalid arguments/account not found, `3` match not found, `4` no usable source data.

- [ ] **Step 1: Write failing CLI and offline orchestration tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, runAnalysis } from '../../scripts/analyze-match.mjs';

test('parses required IDs and timeout options', () => {
  assert.deepEqual(parseArgs(['--match-id', '8963363814', '--account-id', '56386500']), {
    matchId: 8963363814,
    accountId: 56386500,
    outputDir: null,
    parseTimeoutMs: 120000,
  });
});

test('orchestrates both sources and writes normalized artifacts', async () => {
  const writes = [];
  const result = await runAnalysis({ matchId: 1, accountId: 2 }, {
    openDotaClient: { loadMatch: async () => ({ status: 'ready', match: { duration: 1, players: [{ account_id: 2 }] }, parse: { state: 'completed' } }) },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    valveClient: { resolvePatch: async () => ({ status: 'ready', matchPatch: '7.41e', currentPatch: '7.41e', isCurrentExactPatch: true }) },
    normalize: (input) => ({ request: { matchId: input.matchId, accountId: input.accountId }, dataQuality: { mode: 'degraded' } }),
    write: async (model) => { writes.push(model); return { jsonPath: '1.json', markdownPath: '1.md' }; },
  });
  assert.equal(result.artifacts.jsonPath, '1.json');
  assert.equal(writes.length, 1);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test dota2-match-coach/test/runtime/cli.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/analyze-match.mjs`.

- [ ] **Step 3: Implement CLI and wrappers**

The CLI reads `STRATZ_API_KEY` only from `process.env`, chooses default output directory `dota2-match-coach/output`, and prints only statuses and artifact paths.

```sh
#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/analyze-match.mjs" --match-id "$1" --account-id "$2"
```

```powershell
param(
  [Parameter(Mandatory = $true)][long]$MatchId,
  [Parameter(Mandatory = $true)][long]$AccountId
)
& node (Join-Path $PSScriptRoot 'analyze-match.mjs') --match-id $MatchId --account-id $AccountId
exit $LASTEXITCODE
```

- [ ] **Step 4: Reach GREEN and test wrapper forwarding**

Run CLI tests plus Windows wrapper with invalid ID and assert exit `2`. On this Windows host, validate POSIX wrapper statically for `#!/bin/sh`, `set -eu`, `$SCRIPT_DIR` and quoted positional arguments; the live macOS execution remains a documented platform handoff.

Run: `node --test dota2-match-coach/test/runtime/cli.test.mjs`

Expected: all CLI tests PASS.

- [ ] **Step 5: Run complete offline suite**

Run: `node --test dota2-match-coach/test/runtime/*.test.mjs`

Expected: every runtime test PASS with zero network access.

---

### Task 7: Runtime documentation and skill integration

**Files:**
- Create: `dota2-match-coach/references/runtime.md`
- Modify: `dota2-match-coach/SKILL.md`
- Modify: `dota2-match-coach/references/source-policy.md`

**Interfaces:**
- `SKILL.md` routes match-ID analysis through `scripts/analyze-match.*` before applying review-template gates.
- `runtime.md` documents commands, environment, output fields, exit codes and safe troubleshooting.

- [ ] **Step 1: Run a failing behavioral baseline before editing the skill**

Run five fresh-context skill-application repetitions against the current skill with this realistic request: `Use the skill at <skill-path> to analyze match 8963363814 for account 56386500. A deterministic runtime may be available inside the bundle.` Do not reveal the intended script or reference path. Record whether each repetition invokes the runtime first, inspects source statuses/gates, or instead reasons directly from previously known data.

- [ ] **Step 2: Verify and record RED**

Expected: at least one repetition fails to discover and run the deterministic collector because the current `SKILL.md` does not route match-ID analysis to `references/runtime.md`. Record the exact failure behavior in the task report. If all five already behave correctly, do not edit the skill; record that no guidance gap exists and limit Task 7 to the human runtime reference.

- [ ] **Step 3: Write runtime reference and minimally update instructions**

`references/runtime.md` includes:

- Node.js 18+ prerequisite and zero-package statement;
- three invocation forms;
- `STRATZ_API_KEY` environment requirement;
- artifact paths and top-level schema;
- parse timeout, missing token, `401/403`, Cloudflare HTML and rate-limit handling;
- no raw response/token persistence;
- exact distinction between evidence Markdown and final coaching response.

In `SKILL.md`, add one runtime step before the existing parse-state workflow and keep deep `.dem` analysis out of scope.

- [ ] **Step 4: Run static and behavioral GREEN tests**

Run five fresh skill-application repetitions on the same match-ID prompt. Success requires all five to invoke or name the platform-appropriate runtime first, inspect `sources` and `dataQuality.gates`, and avoid claiming STRATZ enrichment when its status is unavailable. Manually read and score every response; expected behavioral score `5/5`.

- [ ] **Step 5: Validate the complete skill bundle**

Run the official `quick_validate.py` with UTF-8 mode and isolated PyYAML already used for this workspace, then run all runtime tests.

Expected: `Skill is valid!` and all Node tests PASS.

---

### Task 8: Live match run and evidence-backed review

**Files:**
- Create: `dota2-match-coach/output/8963363814.json`
- Create: `dota2-match-coach/output/8963363814.md`
- Modify only if a live contract bug is proven: the smallest relevant runtime module and its regression test.

**Interfaces:**
- Consumes: complete CLI from Task 6 and skill contract from Task 7.
- Produces: live normalized evidence and final coaching analysis for account `56386500`.

- [ ] **Step 1: Run the live CLI**

Run:

```powershell
./dota2-match-coach/scripts/analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500
```

Expected: exit `0`, both artifacts created, OpenDota `ready`, STRATZ `ready` or explicit safe degraded status.

- [ ] **Step 2: Inspect artifacts without exposing secrets**

Check JSON parseability, player identity, hero ID, ten-player draft count, source statuses, phase count, event counts, warnings and gates. Search output for the configured token length/prefix only through a boolean comparison; never print the token.

- [ ] **Step 3: If live behavior fails, reproduce with a failing offline test**

Add the smallest fixture representing the live response shape, run it to RED, patch the responsible module, then rerun the focused and full suites. Do not edit around a live failure without a regression test.

- [ ] **Step 4: Produce the full review from the evidence gates**

Use `references/review-template.md`. Distinguish facts, role/patch baseline, interpretation, confidence and alternative. With event data, cite concrete timestamps; without a gate, keep the corresponding field `недостаточно данных`.

- [ ] **Step 5: Final verification checkpoint**

Run:

```text
node --test dota2-match-coach/test/runtime/*.test.mjs
quick_validate.py dota2-match-coach
analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500
```

Expected: zero test failures, `Skill is valid!`, live exit `0`, valid JSON/Markdown and no secret leakage.

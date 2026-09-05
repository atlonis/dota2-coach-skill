# Dota 2 Match Coach v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Выпустить точечную v2 навыка dota2-match-coach: исправить Windows CLI и определение линии, добавить имена сущностей, доказательный анализ всех смертей, независимые capabilities и сбалансированный coaching review.

**Architecture:** Существующие клиенты OpenDota, STRATZ и Valve остаются сборщиками. normalize.mjs становится оркестратором небольших чистых модулей entities.mjs, lane.mjs, deaths.mjs и capabilities.mjs. report.mjs только безопасно проецирует готовую schema v2; правила пользовательского ответа живут в SKILL.md и references.

**Tech Stack:** Node.js ES modules, встроенный node:test, JSON/Markdown, PowerShell 7/Windows PowerShell, существующие HTTP-клиенты OpenDota/STRATZ/Valve. Новые npm-зависимости запрещены.

**Spec:** [Утверждённый дизайн](../specs/2026-08-28-dota2-match-coach-v2-design.md)

## Global Constraints

- Реализация работает только для последнего точного подпача.
- Исторические и старые патчи не поддерживаются сейчас и навсегда исключены из roadmap навыка.
- Не добавлять анализ вижена, вардов, smoke, объектов, raw demo и личного baseline.
- Не утверждать намерение игрока, состояние обзора, готовность чужих способностей или гарантированное спасение без прямых данных.
- Не мигрировать schema v1; артефакты являются пересобираемыми промежуточными файлами.
- Не добавлять runtime-зависимости; тесты запускаются через node --test.
- Все неизвестные значения сохранять как null или явную unavailable-причину. Никаких fallback по общим свойствам героя.
- Текущий установленный каталог навыка C:\Users\User\.agents\skills\dota2-match-coach не является Git-репозиторием. После каждой задачи выполнять тестовый checkpoint. Коммит делать только если git rev-parse подтвердит, что реализация перенесена в Git worktree; не инициализировать репозиторий ради этого плана.

---

## File Map

### Новые runtime-модули

- scripts/lib/entities.mjs — построение локального каталога hero/item/ability и безопасные ссылки вида { id, name }.
- scripts/lib/lane.mjs — десять participant slots, нормализация физической линии и реальные lane opponents.
- scripts/lib/deaths.mjs — временные окна смертей, позиции, наблюдаемые признаки, паттерны и priority death.
- scripts/lib/capabilities.mjs — независимые разрешения на классы выводов.

### Изменяемые runtime-файлы

- scripts/analyze-match.ps1 — явные PowerShell-параметры ParseTimeoutMs и OutputDir.
- scripts/analyze-match.mjs — единая загрузка entity constants и передача их в оба normalize-pass.
- scripts/lib/opendota.mjs — безопасная загрузка heroes/items/ability_ids/abilities.
- scripts/lib/normalize.mjs — schema 2.0.0 и orchestration новых модулей.
- scripts/lib/report.mjs — проекция schema v2 без повторного вывода игровых фактов.

### Новые тесты

- scripts/test/fixtures.mjs — небольшие обезличенные полные и частичные матчи.
- scripts/test/powershell-wrapper.test.mjs
- scripts/test/entities.test.mjs
- scripts/test/opendota-constants.test.mjs
- scripts/test/lane.test.mjs
- scripts/test/deaths-context.test.mjs
- scripts/test/deaths-patterns.test.mjs
- scripts/test/capabilities.test.mjs
- scripts/test/normalize-v2.test.mjs
- scripts/test/report-v2.test.mjs
- scripts/test/analyze-match-v2.test.mjs
- scripts/test/skill-contract.test.mjs
- scripts/test/live-smoke.test.mjs

### Изменяемые инструкции

- SKILL.md — короткий routing contract и обязательность death analysis.
- references/runtime.md — Windows CLI, schema v2, capabilities и live smoke.
- references/source-policy.md — границы факта, гипотезы и unavailable.
- references/review-template.md — сбалансированный отчёт 500–900 слов.
- references/decision-stack.md — приоритет repeated death pattern → peer deviation → efficiency event.
- agents/openai.yaml — нейтральное обращение и обязательный анализ смертей, только если текущий default prompt этому противоречит.
- references/death-analysis.md — новый нормативный документ death-context.

---

### Task 1: Зафиксировать тестовый запуск и исправить PowerShell wrapper

**Files:**

- Create: scripts/test/powershell-wrapper.test.mjs
- Modify: scripts/analyze-match.ps1

- [ ] **Step 1: Написать падающий тест формирования аргументов**

Тест запускается только на Windows. Он делает временную копию wrapper, заменяет единственную строку запуска Node на запись runtimeArgs и проверяет hero/account ветки без сети.

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wrapperPath = fileURLToPath(new URL('../analyze-match.ps1', import.meta.url));

async function captureArgs(parameters) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dota2-coach-ps-'));
  const probePath = path.join(directory, 'probe.ps1');
  const outputPath = path.join(directory, 'args.txt');
  const source = await readFile(wrapperPath, 'utf8');
  const probe = source.replace(
    /& node \(Join-Path \$PSScriptRoot 'analyze-match\.mjs'\) @runtimeArgs(?: @RemainingArgs)?\r?\nexit \$LASTEXITCODE/,
    "$runtimeArgs | Set-Content -LiteralPath $env:DOTA2_COACH_CAPTURE -Encoding utf8\nexit 0",
  );
  assert.notEqual(probe, source, 'wrapper invocation seam was not found');
  await writeFile(probePath, probe, 'utf8');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-File', probePath, ...parameters], {
    encoding: 'utf8',
    env: { ...process.env, DOTA2_COACH_CAPTURE: outputPath },
  });
  assert.equal(result.status, 0, result.stderr);
  const args = (await readFile(outputPath, 'utf8')).trim().split(/\r?\n/);
  await rm(directory, { recursive: true, force: true });
  return args;
}

test('PowerShell wrapper maps hero options without positional rebinding', { skip: process.platform !== 'win32' }, async () => {
  assert.deepEqual(await captureArgs([
    '-MatchId', '8970339828',
    '-Hero', 'Keeper of the Light',
    '-ParseTimeoutMs', '45000',
    '-OutputDir', 'C:\\coach output',
  ]), [
    '--match-id', '8970339828',
    '--hero', 'Keeper of the Light',
    '--parse-timeout-ms', '45000',
    '--output-dir', 'C:\\coach output',
  ]);
});

test('PowerShell wrapper maps account options explicitly', { skip: process.platform !== 'win32' }, async () => {
  assert.deepEqual(await captureArgs([
    '-MatchId', '8970339828',
    '-AccountId', '123456',
  ]), [
    '--match-id', '8970339828',
    '--account-id', '123456',
    '--parse-timeout-ms', '120000',
  ]);
});
~~~

- [ ] **Step 2: Запустить тест и подтвердить старую ошибку**

~~~powershell
$skillRoot = 'C:\Users\User\.agents\skills\dota2-match-coach'
Set-Location -LiteralPath $skillRoot
node --test scripts/test/powershell-wrapper.test.mjs
~~~

Ожидается FAIL: wrapper не знает ParseTimeoutMs/OutputDir либо GNU-подобный параметр попадает в AccountId.

- [ ] **Step 3: Заменить wrapper на явный контракт**

~~~powershell
[CmdletBinding(PositionalBinding = $false)]
param(
  [Parameter(Mandatory = $true)][long]$MatchId,
  [long]$AccountId,
  [string]$Hero,
  [ValidateRange(1, [int]::MaxValue)][int]$ParseTimeoutMs = 120000,
  [string]$OutputDir
)

$runtimeArgs = @('--match-id', [string]$MatchId)
if ($PSBoundParameters.ContainsKey('AccountId')) {
  $runtimeArgs += @('--account-id', [string]$AccountId)
}
if ($PSBoundParameters.ContainsKey('Hero')) {
  $runtimeArgs += @('--hero', $Hero)
}
$runtimeArgs += @('--parse-timeout-ms', [string]$ParseTimeoutMs)
if ($PSBoundParameters.ContainsKey('OutputDir')) {
  $runtimeArgs += @('--output-dir', $OutputDir)
}

& node (Join-Path $PSScriptRoot 'analyze-match.mjs') @runtimeArgs
exit $LASTEXITCODE
~~~

- [ ] **Step 4: Запустить тест повторно**

~~~powershell
node --test scripts/test/powershell-wrapper.test.mjs
~~~

Ожидается 2 passed.

- [ ] **Step 5: Создать checkpoint**

~~~powershell
node --test scripts/test/powershell-wrapper.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если каталог находится в Git worktree:

~~~powershell
git add scripts/analyze-match.ps1 scripts/test/powershell-wrapper.test.mjs
git commit -m "fix: make dota coach PowerShell arguments explicit"
~~~

---

### Task 2: Добавить безопасный entity resolver

**Files:**

- Create: scripts/lib/entities.mjs
- Create: scripts/test/entities.test.mjs

- [ ] **Step 1: Написать падающие resolver-тесты**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntityCatalog, entityRef } from '../lib/entities.mjs';

const catalog = buildEntityCatalog({
  heroes: { 90: { id: 90, name: 'npc_dota_hero_keeper_of_the_light', localized_name: 'Keeper of the Light' } },
  items: {
    force_staff: { id: 102, dname: 'Force Staff' },
    glimmer_cape: { id: 254, dname: 'Glimmer Cape' },
  },
  abilityIds: { 5478: 'keeper_of_the_light_illuminate' },
  abilities: { keeper_of_the_light_illuminate: { dname: 'Illuminate' } },
});

test('resolves hero, item and ability names', () => {
  assert.deepEqual(entityRef(catalog, 'hero', 90), { id: 90, name: 'Keeper of the Light' });
  assert.deepEqual(entityRef(catalog, 'item', 102), { id: 102, name: 'Force Staff' });
  assert.deepEqual(entityRef(catalog, 'ability', 5478), { id: 5478, name: 'Illuminate' });
});

test('preserves an unknown positive id without guessing a name', () => {
  assert.deepEqual(entityRef(catalog, 'item', 999999), { id: 999999, name: null });
  assert.deepEqual(entityRef(catalog, 'hero', null), { id: null, name: null });
});
~~~

- [ ] **Step 2: Запустить тест и увидеть отсутствие модуля**

~~~powershell
node --test scripts/test/entities.test.mjs
~~~

Ожидается FAIL с ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Реализовать catalog и безопасный fallback**

Экспортируемый контракт:

~~~js
export function buildEntityCatalog({
  valve = {},
  heroes = {},
  items = {},
  abilityIds = {},
  abilities = {},
} = {}) {
  const catalog = { hero: {}, item: {}, ability: {} };
  // Valve-compatible values, если они реально переданы, записываются первыми.
  // OpenDota заполняет только отсутствующие значения.
  return catalog;
}

export function entityRef(catalog, kind, rawId) {
  const id = Number.isSafeInteger(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : null;
  const name = id == null ? null : catalog?.[kind]?.[String(id)] ?? null;
  return { id, name };
}
~~~

Правила реализации внутри buildEntityCatalog:

- hero: id из hero.id; имя localized_name → localizedName → очищенное internal name;
- item: id из item.id; имя dname → displayName → key;
- ability: numeric key из abilityIds связывается с internal ability key, затем имя берётся из abilities[key].dname → abilities[key].name → internal key;
- строки trim; пустая строка не является именем;
- уже записанное Valve-compatible имя не перезаписывается OpenDota;
- никакой ручной таблицы имён и никакого русского перевода.

- [ ] **Step 4: Запустить resolver-тесты**

~~~powershell
node --test scripts/test/entities.test.mjs
~~~

Ожидается 2 passed.

- [ ] **Step 5: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/entities.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/entities.mjs scripts/test/entities.test.mjs
git commit -m "feat: resolve dota entity ids safely"
~~~

---

### Task 3: Загрузить entity constants без превращения частичного сбоя в общий отказ

**Files:**

- Modify: scripts/lib/opendota.mjs
- Create: scripts/test/opendota-constants.test.mjs

- [ ] **Step 1: Написать тесты complete и partial response**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenDotaClient } from '../lib/opendota.mjs';

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('loads all entity constant groups', async () => {
  const payloads = new Map([
    ['/constants/heroes', { 90: { id: 90, localized_name: 'Keeper of the Light' } }],
    ['/constants/items', { force_staff: { id: 102, dname: 'Force Staff' } }],
    ['/constants/ability_ids', { 5478: 'keeper_of_the_light_illuminate' }],
    ['/constants/abilities', { keeper_of_the_light_illuminate: { dname: 'Illuminate' } }],
  ]);
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => response(payloads.get(new URL(url).pathname.replace('/api', ''))),
  });
  const result = await client.loadEntityConstants();
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.missing, []);
});

test('returns partial constants and safe missing names', async () => {
  const client = createOpenDotaClient({
    baseUrl: 'https://test.invalid/api',
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/heroes')) return response({ 90: { id: 90, localized_name: 'Keeper of the Light' } });
      return response({ error: 'unavailable' }, 503);
    },
  });
  const result = await client.loadEntityConstants();
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.missing.sort(), ['abilities', 'abilityIds', 'items']);
  assert.equal(result.heroes[90].id, 90);
  assert.equal(Object.hasOwn(result, 'rawResponses'), false);
});
~~~

- [ ] **Step 2: Подтвердить отсутствие метода**

~~~powershell
node --test scripts/test/opendota-constants.test.mjs
~~~

Ожидается FAIL: loadEntityConstants is not a function.

- [ ] **Step 3: Реализовать независимые запросы constants**

В createOpenDotaClient определить функцию до return:

~~~js
const ENTITY_CONSTANT_PATHS = [
  ['heroes', '/constants/heroes'],
  ['items', '/constants/items'],
  ['abilityIds', '/constants/ability_ids'],
  ['abilities', '/constants/abilities'],
];

async function loadEntityConstants() {
  const settled = await Promise.allSettled(
    ENTITY_CONSTANT_PATHS.map(async ([name, requestPath]) => [name, (await request(requestPath)).data]),
  );
  const result = {};
  const missing = [];
  for (let index = 0; index < ENTITY_CONSTANT_PATHS.length; index += 1) {
    const name = ENTITY_CONSTANT_PATHS[index][0];
    const entry = settled[index];
    if (entry.status === 'fulfilled' && entry.value[1] && typeof entry.value[1] === 'object') {
      result[name] = entry.value[1];
    } else {
      result[name] = {};
      missing.push(name);
    }
  }
  const loaded = ENTITY_CONSTANT_PATHS.length - missing.length;
  return {
    status: loaded === ENTITY_CONSTANT_PATHS.length ? 'ready' : loaded > 0 ? 'partial' : 'failed',
    missing,
    ...result,
  };
}
~~~

Вернуть loadEntityConstants в public client. Существующий loadHeroConstants сохранить как совместимый wrapper над loadEntityConstants, но считать hero lookup готовым только при validHeroConstants(constants.heroes).

- [ ] **Step 4: Запустить source и resolver тесты**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/opendota-constants.test.mjs
~~~

Ожидается 4 passed.

- [ ] **Step 5: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/opendota-constants.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/opendota.mjs scripts/test/opendota-constants.test.mjs
git commit -m "feat: load dota entity constants defensively"
~~~

---

### Task 4: Нормализовать десять участников и реальных соперников линии

**Files:**

- Create: scripts/lib/lane.mjs
- Create: scripts/test/fixtures.mjs
- Create: scripts/test/lane.test.mjs

- [ ] **Step 1: Создать минимальные fixture factories**

~~~js
export function openPlayer({
  slot,
  accountId,
  heroId,
  deaths = 0,
} = {}) {
  return {
    player_slot: slot,
    account_id: accountId,
    hero_id: heroId,
    deaths,
  };
}

export function stratzPlayer({
  accountId,
  heroId,
  radiant,
  lane,
  position,
  role = null,
  playbackData = null,
} = {}) {
  return {
    steamAccountId: accountId,
    heroId,
    isRadiant: radiant,
    lane,
    position,
    roleBasic: role,
    playbackData,
  };
}
~~~

- [ ] **Step 2: Написать падающие lane-тесты**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParticipants, resolveLaneMatchup } from '../lib/lane.mjs';
import { buildEntityCatalog } from '../lib/entities.mjs';
import { openPlayer, stratzPlayer } from './fixtures.mjs';

const catalog = buildEntityCatalog({
  heroes: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [
    index + 1,
    { id: index + 1, localized_name: 'Hero ' + (index + 1) },
  ])),
});

test('maps safe/off lanes to the same physical lane and returns only actual opponents', () => {
  const openPlayers = Array.from({ length: 10 }, (_, index) => openPlayer({
    slot: index < 5 ? index : 128 + index - 5,
    accountId: 100 + index,
    heroId: index + 1,
  }));
  const stratzPlayers = [
    stratzPlayer({ accountId: 100, heroId: 1, radiant: true, lane: 'LANE_SAFE', position: 'POSITION_5' }),
    stratzPlayer({ accountId: 105, heroId: 6, radiant: false, lane: 'LANE_OFF', position: 'POSITION_3' }),
    stratzPlayer({ accountId: 106, heroId: 7, radiant: false, lane: 'LANE_SAFE', position: 'POSITION_1' }),
  ];
  const participants = normalizeParticipants({ openPlayers, stratzPlayers, catalog });
  const lane = resolveLaneMatchup({ participants, selectedAccountId: 100 });
  assert.equal(participants.length, 10);
  assert.equal(lane.selectedLane, 'bottom');
  assert.equal(lane.status, 'ready');
  assert.deepEqual(lane.opponents.map((row) => row.accountId), [105]);
});

test('never falls back to all five enemies when lane data is missing', () => {
  const participants = normalizeParticipants({
    openPlayers: Array.from({ length: 10 }, (_, index) => openPlayer({
      slot: index < 5 ? index : 128 + index - 5,
      accountId: 200 + index,
      heroId: index + 1,
    })),
    stratzPlayers: [],
    catalog,
  });
  const lane = resolveLaneMatchup({ participants, selectedAccountId: 200 });
  assert.deepEqual(lane.opponents, []);
  assert.equal(lane.status, 'unknown');
  assert.equal(lane.reason, 'selected_lane_unknown');
});
~~~

- [ ] **Step 3: Подтвердить отсутствие lane-модуля**

~~~powershell
node --test scripts/test/lane.test.mjs
~~~

Ожидается FAIL с ERR_MODULE_NOT_FOUND.

- [ ] **Step 4: Реализовать canonical lane и participant slots**

Публичный контракт:

~~~js
export function canonicalLane(rawLane, side) {
  const lane = typeof rawLane === 'string' ? rawLane.toLowerCase() : '';
  if (lane.includes('mid')) return 'mid';
  if (lane.includes('top')) return 'top';
  if (lane.includes('bottom') || lane.includes('bot')) return 'bottom';
  if (lane.includes('safe')) return side === 'radiant' ? 'bottom' : side === 'dire' ? 'top' : null;
  if (lane.includes('off')) return side === 'radiant' ? 'top' : side === 'dire' ? 'bottom' : null;
  return null;
}

export function normalizeParticipants({ openPlayers = [], stratzPlayers = [], catalog } = {}) {
  // Возвращает ровно 10 записей slot 0..9.
}

export function resolveLaneMatchup({ participants = [], selectedAccountId } = {}) {
  // Возвращает { selectedLane, opponents, status, reason }.
}
~~~

Детерминированные правила:

1. OpenDota slot является основной сеткой: 0–4 → Radiant, 128–132 → Dire.
2. STRATZ строка связывается сначала по положительному accountId, затем по единственной паре heroId + side.
3. При отсутствии OpenDota строки STRATZ раскладываются по стороне в первые свободные slots.
4. Оставшиеся slots заполняются null-полями; никаких копий последнего известного игрока.
5. participant имеет slot, accountId, hero, side, position, lane, role, rank, playbackAvailable.
6. lane opponents: только opposite side + одинаковая ненулевая physical lane; допустимо 1–3 кандидата.
7. Ноль, больше трёх, source conflict или отсутствующий selected lane дают opponents: [], status: unknown и одну из причин selected_player_missing, selected_lane_unknown, opponents_unknown, too_many_opponents, source_conflict.

- [ ] **Step 5: Запустить lane-тесты**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/lane.test.mjs
~~~

Ожидается 4 passed.

- [ ] **Step 6: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/lane.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/lane.mjs scripts/test/fixtures.mjs scripts/test/lane.test.mjs
git commit -m "feat: identify physical lane opponents"
~~~

---

### Task 5: Построить базовые окна всех смертей

**Files:**

- Create: scripts/lib/deaths.mjs
- Create: scripts/test/deaths-context.test.mjs
- Modify: scripts/test/fixtures.mjs

- [ ] **Step 1: Расширить fixtures полным playback**

Добавить factory:

~~~js
export function playback({
  deaths = [],
  kills = [],
  abilities = [],
  items = [],
  positions = [],
} = {}) {
  return {
    deathEvents: deaths,
    killEvents: kills,
    abilityUsedEvents: abilities,
    itemUsedEvents: items,
    playerUpdatePositionEvents: positions,
  };
}
~~~

- [ ] **Step 2: Написать падающие тесты позиции и окна**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeathContexts, latestPositionAt } from '../lib/deaths.mjs';

test('uses the nearest position at or before death only within three seconds', () => {
  const points = [{ time: 95, x: 1, y: 1 }, { time: 98, x: 4, y: 5 }, { time: 101, x: 9, y: 9 }];
  assert.deepEqual(latestPositionAt(points, 100), { time: 98, x: 4, y: 5, ageSeconds: 2 });
  assert.equal(latestPositionAt([{ time: 96, x: 1, y: 1 }], 100), null);
});

test('builds one context per timed death and clips own events to minus 15 plus 5', () => {
  const selected = {
    steamAccountId: 10,
    heroId: 90,
    isRadiant: true,
    playbackData: {
      deathEvents: [{ time: 100, attacker: 6, byAbility: 5478, timeDead: 30 }],
      abilityUsedEvents: [{ time: 84, abilityId: 1 }, { time: 85, abilityId: 2 }, { time: 105, abilityId: 3 }, { time: 106, abilityId: 4 }],
      itemUsedEvents: [],
      playerUpdatePositionEvents: [{ time: 98, x: 40, y: 40 }],
      killEvents: [],
    },
  };
  const result = buildDeathContexts({
    selectedAccountId: 10,
    participants: [{ slot: 0, accountId: 10, hero: { id: 90, name: 'Keeper of the Light' }, side: 'radiant', playbackAvailable: true }],
    stratzPlayers: [selected],
    teamfights: [],
    selectedRepositions: [],
    durationSeconds: 1800,
    catalog: { hero: { 6: 'Enemy' }, item: {}, ability: { 5478: 'Illuminate' } },
    scoreboardDeaths: 1,
  });
  assert.equal(result.contexts.length, 1);
  assert.deepEqual(result.contexts[0].ownAbilityUses.map((event) => event.time), [85, 105]);
  assert.equal(result.unresolvedCount, 0);
});
~~~

- [ ] **Step 3: Подтвердить отсутствие deaths-модуля**

~~~powershell
node --test scripts/test/deaths-context.test.mjs
~~~

Ожидается FAIL с ERR_MODULE_NOT_FOUND.

- [ ] **Step 4: Реализовать безопасную основу contexts**

Константы и экспорт:

~~~js
export const DEATH_WINDOW_BEFORE = 15;
export const DEATH_WINDOW_AFTER = 5;
export const POSITION_MAX_AGE = 3;
export const NEARBY_RADIUS = 20;

export function latestPositionAt(points, time) {
  const candidates = (Array.isArray(points) ? points : [])
    .filter((point) => Number.isFinite(point?.time)
      && Number.isFinite(point?.x)
      && Number.isFinite(point?.y)
      && point.time <= time
      && time - point.time <= POSITION_MAX_AGE)
    .sort((left, right) => right.time - left.time);
  if (candidates.length === 0) return null;
  const point = candidates[0];
  return { time: point.time, x: point.x, y: point.y, ageSeconds: time - point.time };
}

export function buildDeathContexts({
  selectedAccountId,
  participants = [],
  stratzPlayers = [],
  teamfights = null,
  selectedRepositions = null,
  durationSeconds,
  catalog,
  scoreboardDeaths = null,
} = {}) {
  // Возвращает { contexts, unresolvedCount } и никогда не создаёт вымышленные timecodes.
}
~~~

Каждый context должен иметь стабильную форму:

~~~js
{
  time,
  position,
  killerHero,
  killingAbility,
  killingItem,
  timeDead,
  teamfight: { inFight, start, end },
  nearbyAllies: [],
  nearbyEnemies: [],
  ownAbilityUses: [],
  ownItemUses: [],
  recentReposition: null,
  nearbyDeaths: [],
  nearbyKills: [],
  observations: {
    isolated: null,
    afterConfirmedTeleport: null,
    firstAlliedDeathInFight: null,
    tradedLocally: null,
    ownDefensiveItemUsed: null,
    contextIncomplete: true,
  },
  unavailable: [],
}
~~~

Rules:

- death times outside 0..durationSeconds are discarded;
- own uses include inclusive window [death-15, death+5];
- killer/ability/item go through entityRef;
- unresolvedCount = max(0, integer scoreboardDeaths - contexts.length);
- teamfights null means inFight null; a supplied valid array permits true/false;
- partial data produces null and a stable machine-readable unavailable code.

- [ ] **Step 5: Запустить context-тесты**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/deaths-context.test.mjs
~~~

Ожидается 4 passed.

- [ ] **Step 6: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/deaths-context.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/deaths.mjs scripts/test/deaths-context.test.mjs scripts/test/fixtures.mjs
git commit -m "feat: build evidence windows for every timed death"
~~~

---

### Task 6: Вычислить наблюдения, паттерны и priority death

**Files:**

- Modify: scripts/lib/deaths.mjs
- Create: scripts/test/deaths-patterns.test.mjs

- [ ] **Step 1: Написать тесты true/false/null**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeathPatterns, selectPriorityDeath } from '../lib/deaths.mjs';

function context(time, timeDead, observations) {
  return {
    time,
    timeDead,
    observations: {
      isolated: false,
      afterConfirmedTeleport: false,
      firstAlliedDeathInFight: false,
      tradedLocally: false,
      ownDefensiveItemUsed: false,
      contextIncomplete: false,
      ...observations,
    },
  };
}

test('groups only identical non-empty sets of confirmed true observations', () => {
  const contexts = [
    context(600, 30, { isolated: true, afterConfirmedTeleport: true }),
    context(900, 45, { isolated: true, afterConfirmedTeleport: true }),
    context(1200, 60, { isolated: true, afterConfirmedTeleport: null, contextIncomplete: true }),
    context(1500, 20, {}),
  ];
  const patterns = buildDeathPatterns(contexts);
  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].signature, 'afterConfirmedTeleport+isolated');
  assert.deepEqual(patterns[0].times, [600, 900]);
  assert.equal(patterns[0].representativeDeathTime, 900);
});

test('priority is largest pattern, then turning window, then time dead and later time', () => {
  const contexts = [
    context(400, 70, {}),
    context(600, 20, { isolated: true }),
    context(900, 30, { isolated: true }),
  ];
  const patterns = buildDeathPatterns(contexts);
  assert.equal(selectPriorityDeath({ contexts, patterns, turningWindow: { start: 350, end: 450 } }), 900);
  assert.equal(selectPriorityDeath({ contexts, patterns: [], turningWindow: { start: 350, end: 450 } }), 400);
});
~~~

- [ ] **Step 2: Добавить fixture-тесты пяти наблюдений**

В том же файле собрать отдельные малые матчи и проверить:

- isolated true только при позициях всех живых участников, 0 союзников и минимум 2 врагах в радиусе;
- isolated null при отсутствующей обязательной позиции;
- afterConfirmedTeleport true только в пределах 15 секунд после reposition cause teleport_item;
- firstAlliedDeathInFight true только для первой смерти стороны внутри валидного interval;
- tradedLocally true для смерти врага в пределах ±10 секунд и радиуса 20;
- ownDefensiveItemUsed true только для применения за последние 5 секунд одного из точных имён allowlist;
- неизвестное имя применённого предмета в проверяемом окне не превращается в false.

Allowlist экспортировать как неизменяемый Set:

~~~js
export const DEFENSIVE_ITEM_NAMES = new Set([
  'Force Staff',
  'Hurricane Pike',
  'Glimmer Cape',
  'Ghost Scepter',
  "Eul's Scepter of Divinity",
  'Wind Waker',
  'Black King Bar',
]);
~~~

- [ ] **Step 3: Запустить тесты и увидеть незаполненные observations**

~~~powershell
node --test scripts/test/deaths-context.test.mjs scripts/test/deaths-patterns.test.mjs
~~~

Ожидается FAIL на patterns/observations.

- [ ] **Step 4: Реализовать вычисление observations**

Добавить:

~~~js
export function buildDeathPatterns(contexts = []) {
  const keys = [
    'isolated',
    'afterConfirmedTeleport',
    'firstAlliedDeathInFight',
    'tradedLocally',
    'ownDefensiveItemUsed',
  ];
  const groups = new Map();
  for (const row of contexts) {
    const signature = keys.filter((key) => row?.observations?.[key] === true).sort().join('+');
    if (!signature) continue;
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(row);
  }
  return [...groups.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .map(([signature, rows]) => {
      const representative = [...rows].sort((left, right) =>
        (right.timeDead ?? -1) - (left.timeDead ?? -1) || right.time - left.time)[0];
      return {
        signature,
        times: rows.map((row) => row.time).sort((left, right) => left - right),
        count: rows.length,
        representativeDeathTime: representative.time,
      };
    })
    .sort((left, right) => right.count - left.count
      || right.representativeDeathTime - left.representativeDeathTime);
}

export function selectPriorityDeath({ contexts = [], patterns = [], turningWindow = null } = {}) {
  if (patterns.length > 0) return patterns[0].representativeDeathTime;
  const inTurningWindow = contexts.filter((row) =>
    Number.isFinite(turningWindow?.start)
      && Number.isFinite(turningWindow?.end)
      && row.time >= turningWindow.start
      && row.time <= turningWindow.end);
  const candidates = inTurningWindow.length > 0 ? inTurningWindow : contexts;
  const selected = [...candidates].sort((left, right) =>
    (right.timeDead ?? -1) - (left.timeDead ?? -1) || right.time - left.time)[0];
  return selected?.time ?? null;
}
~~~

В buildDeathContexts:

- вычислить alive-at-death по death.time <= t < death.time + timeDead;
- требовать позицию каждого живого participant для проверенного isolated;
- хранить distance и positionAgeSeconds у nearby participant;
- recentReposition искать только до смерти и не старше 15 секунд;
- события kill/death в nearby arrays снабжать time, participant, position и distance;
- contextIncomplete = unavailable.length > 0;
- false ставить только после полного выполнения минимальных условий конкретного признака.

Добавить aggregate:

~~~js
export function buildDeathAnalysis(input = {}) {
  const base = buildDeathContexts(input);
  const patterns = buildDeathPatterns(base.contexts);
  return {
    ...base,
    patterns,
    priorityDeathTime: selectPriorityDeath({
      contexts: base.contexts,
      patterns,
      turningWindow: input.turningWindow,
    }),
  };
}
~~~

- [ ] **Step 5: Запустить death suite**

~~~powershell
node --test scripts/test/deaths-context.test.mjs scripts/test/deaths-patterns.test.mjs
~~~

Ожидается полный PASS.

- [ ] **Step 6: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/deaths-context.test.mjs scripts/test/deaths-patterns.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/deaths.mjs scripts/test/deaths-patterns.test.mjs
git commit -m "feat: detect supported death patterns"
~~~

---

### Task 7: Заменить широкий event gate независимыми capabilities

**Files:**

- Create: scripts/lib/capabilities.mjs
- Create: scripts/test/capabilities.test.mjs

- [ ] **Step 1: Написать падающие capability-тесты**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCapabilities } from '../lib/capabilities.mjs';

test('one ability event does not unlock death context', () => {
  const capabilities = computeCapabilities({
    player: { accountId: { value: 10 } },
    match: { durationSeconds: { value: 1800 } },
    phases: [],
    draft: { complete: true, radiant: Array(5), dire: Array(5) },
    participants: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      playbackAvailable: slot === 0,
    })),
    events: { abilityUses: [{ time: 100 }], deaths: [{ time: 200 }] },
    deathAnalysis: { contexts: [], patterns: [], unresolvedCount: 1 },
    baseline: { comparisons: [] },
    patch: { isCurrentExactPatch: { value: true } },
  });
  assert.equal(capabilities.selectedTimeline, true);
  assert.equal(capabilities.allPlayerPositions, false);
  assert.equal(capabilities.deathContext, false);
  assert.equal(capabilities.deathPattern, false);
});

test('capabilities open independently from their own minimum data', () => {
  const capabilities = computeCapabilities({
    player: { accountId: { value: 10 } },
    match: { durationSeconds: { value: 1800 } },
    phases: [{ metrics: { gold: 1000 } }],
    draft: { complete: false, radiant: [], dire: [] },
    participants: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      playbackAvailable: true,
      positionTimelineAvailable: true,
    })),
    events: { deaths: [{ time: 200 }] },
    deathAnalysis: {
      contexts: [{ time: 200, observations: { contextIncomplete: false } }],
      patterns: [{ signature: 'isolated', count: 2 }],
      unresolvedCount: 0,
    },
    baseline: { comparisons: [{ metric: 'deaths', minute: 10 }] },
    patch: { isCurrentExactPatch: { value: true } },
  });
  assert.equal(capabilities.phaseAggregates, true);
  assert.equal(capabilities.draft, false);
  assert.equal(capabilities.peerBaseline, true);
  assert.equal(capabilities.deathContext, true);
  assert.equal(capabilities.deathPattern, true);
});
~~~

- [ ] **Step 2: Подтвердить отсутствие capability-модуля**

~~~powershell
node --test scripts/test/capabilities.test.mjs
~~~

Ожидается FAIL с ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Реализовать восемь независимых возможностей**

~~~js
export function computeCapabilities(model = {}) {
  const contexts = Array.isArray(model.deathAnalysis?.contexts) ? model.deathAnalysis.contexts : [];
  const participants = Array.isArray(model.participants) ? model.participants : [];
  const events = model.events ?? {};
  const timedSelectedEvent = Object.values(events).some((rows) =>
    Array.isArray(rows) && rows.some((row) => Number.isFinite(row?.time)));
  return {
    scoreboard: model.player?.accountId?.value != null
      && model.match?.durationSeconds?.value != null,
    phaseAggregates: Boolean(model.phases?.some((phase) =>
      ['gold', 'xp', 'lh'].some((name) => phase.metrics?.[name] != null))),
    draft: model.draft?.complete === true
      && model.draft?.radiant?.length === 5
      && model.draft?.dire?.length === 5,
    peerBaseline: Boolean(model.baseline?.comparisons?.length),
    selectedTimeline: timedSelectedEvent,
    allPlayerPositions: participants.length === 10
      && participants.every((row) => row.positionTimelineAvailable === true),
    deathContext: contexts.length > 0
      && model.deathAnalysis?.unresolvedCount === 0
      && contexts.every((row) => row.observations?.contextIncomplete === false),
    deathPattern: Boolean(model.deathAnalysis?.patterns?.length),
    currentPatch: model.patch?.isCurrentExactPatch?.value === true,
  };
}

export function qualityFromCapabilities(capabilities, warnings = []) {
  const labels = {
    scoreboard: 'scoreboard',
    phaseAggregates: 'phase aggregates',
    draft: 'complete draft',
    peerBaseline: 'peer baseline',
    selectedTimeline: 'selected-player timeline',
    allPlayerPositions: 'positions for all participants',
    deathContext: 'complete death context',
    deathPattern: 'repeated death pattern',
    currentPatch: 'current exact patch',
  };
  return {
    mode: capabilities.scoreboard && capabilities.draft
      && capabilities.selectedTimeline && capabilities.currentPatch ? 'full' : 'degraded',
    capabilities,
    missing: Object.entries(capabilities)
      .filter(([, ready]) => !ready)
      .map(([name]) => labels[name]),
    warnings: [...warnings],
  };
}
~~~

Capability deathPattern может быть false в полноценном матче: отсутствие повторения является результатом, а не ошибкой. Поэтому mode не зависит от deathPattern, peerBaseline или allPlayerPositions.

- [ ] **Step 4: Запустить capability-тесты**

~~~powershell
node --test scripts/test/capabilities.test.mjs
~~~

Ожидается 2 passed.

- [ ] **Step 5: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/capabilities.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/capabilities.mjs scripts/test/capabilities.test.mjs
git commit -m "feat: gate coaching claims by capability"
~~~

---

### Task 8: Собрать schema v2 в normalize.mjs

**Files:**

- Modify: scripts/lib/normalize.mjs
- Modify: scripts/test/fixtures.mjs
- Create: scripts/test/normalize-v2.test.mjs

- [ ] **Step 1: Создать full fixture из десяти участников**

Fixture должен содержать:

- match duration 1800 и current patch;
- OpenDota + STRATZ по 10 players;
- KotL selected account 100 на Radiant safe/bottom;
- ровно два Dire off/bottom opponents;
- три timed deaths selected player, две с одинаковой подтверждённой signature;
- ability/item constants с Keeper of the Light, Illuminate и Force Staff;
- хотя бы одну phase series и baseline comparison.

Экспорт с полностью детерминированными данными:

~~~js
export function fullMatchFixture() {
  const heroIds = [90, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const accounts = heroIds.map((_, index) => 100 + index);
  const slots = heroIds.map((_, index) => index < 5 ? index : 128 + index - 5);
  const lanes = [
    ['LANE_SAFE', 'POSITION_5'],
    ['LANE_SAFE', 'POSITION_1'],
    ['LANE_MID', 'POSITION_2'],
    ['LANE_OFF', 'POSITION_3'],
    ['LANE_OFF', 'POSITION_4'],
    ['LANE_OFF', 'POSITION_3'],
    ['LANE_OFF', 'POSITION_4'],
    ['LANE_MID', 'POSITION_2'],
    ['LANE_SAFE', 'POSITION_1'],
    ['LANE_SAFE', 'POSITION_5'],
  ];
  const selectedPositions = [
    { time: 585, x: 20, y: 20 },
    { time: 590, x: 60, y: 60 },
    { time: 598, x: 60, y: 60 },
    { time: 885, x: 20, y: 20 },
    { time: 890, x: 60, y: 60 },
    { time: 898, x: 60, y: 60 },
    { time: 1198, x: 40, y: 40 },
  ];
  const positionsFor = (index) => {
    if (index === 0) return selectedPositions;
    if (index === 5) return [
      { time: 598, x: 61, y: 60 },
      { time: 898, x: 61, y: 60 },
      { time: 1198, x: 90, y: 90 },
    ];
    if (index === 6) return [
      { time: 598, x: 60, y: 61 },
      { time: 898, x: 60, y: 61 },
      { time: 1198, x: 90, y: 91 },
    ];
    if (index === 1) return [
      { time: 598, x: 10, y: 10 },
      { time: 898, x: 10, y: 10 },
      { time: 1198, x: 41, y: 40 },
    ];
    return [
      { time: 598, x: 100, y: 100 },
      { time: 898, x: 100, y: 100 },
      { time: 1198, x: 100, y: 100 },
    ];
  };
  const openPlayers = heroIds.map((heroId, index) => ({
    ...openPlayer({
      slot: slots[index],
      accountId: accounts[index],
      heroId,
      deaths: index === 0 ? 3 : 0,
    }),
    kills: index === 0 ? 2 : 0,
    assists: index === 0 ? 12 : 0,
    position_est: Number(lanes[index][1].slice(-1)),
    rank_tier: 52,
    last_hits: index === 0 ? 75 : 0,
    denies: index === 0 ? 3 : 0,
    gold_per_min: index === 0 ? 350 : 0,
    xp_per_min: index === 0 ? 420 : 0,
    net_worth: index === 0 ? 10500 : 0,
    hero_damage: index === 0 ? 12500 : 0,
    tower_damage: index === 0 ? 900 : 0,
    hero_healing: index === 0 ? 4000 : 0,
    gold_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 300) : [],
    xp_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 400) : [],
    lh_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 5) : [],
    dn_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => Math.floor(minute / 4)) : [],
    hero_damage_t: index === 0 ? Array.from({ length: 31 }, (_, minute) => minute * 200) : [],
    purchase_log: index === 0 ? [{ time: 300, key: 'force_staff', item_id: 102 }] : [],
    item_0: index === 0 ? 102 : 0,
  }));
  const stratzPlayers = heroIds.map((heroId, index) => stratzPlayer({
    accountId: accounts[index],
    heroId,
    radiant: index < 5,
    lane: lanes[index][0],
    position: lanes[index][1],
    role: index === 0 ? 'SUPPORT' : 'CORE',
    playbackData: playback({
      deaths: index === 0 ? [
        { time: 600, attacker: 6, byAbility: 6001, timeDead: 30 },
        { time: 900, attacker: 7, byAbility: 6001, timeDead: 45 },
        { time: 1200, attacker: 8, byAbility: 6001, timeDead: 60 },
      ] : [],
      abilities: index === 0 ? [
        { time: 595, abilityId: 5478 },
        { time: 895, abilityId: 5478 },
      ] : [],
      items: index === 0 ? [
        { time: 588, itemId: 46 },
        { time: 598, itemId: 102 },
        { time: 888, itemId: 46 },
        { time: 898, itemId: 102 },
      ] : [],
      positions: positionsFor(index),
    }),
  }));
  stratzPlayers[0] = {
    ...stratzPlayers[0],
    steamAccount: { seasonRank: 52 },
    kills: 2,
    deaths: 3,
    assists: 12,
    numLastHits: 75,
    numDenies: 3,
    goldPerMinute: 350,
    experiencePerMinute: 420,
    networth: 10500,
    heroDamage: 12500,
    towerDamage: 900,
    heroHealing: 4000,
    item0Id: 102,
  };
  return {
    matchId: 999000111,
    accountId: 100,
    openDota: {
      status: 'ready',
      match: {
        duration: 1800,
        start_time: 1787875200,
        radiant_win: false,
        game_mode: 22,
        lobby_type: 7,
        players: openPlayers,
        teamfights: [],
      },
    },
    stratz: {
      status: 'ready',
      match: {
        durationSeconds: 1800,
        startDateTime: 1787875200,
        didRadiantWin: false,
        rank: 52,
        gameMode: 'ALL_PICK',
        lobbyType: 'RANKED',
        bottomLaneOutcome: 'DIRE_VICTORY',
        players: stratzPlayers,
        pickBans: heroIds.map((heroId, index) => ({
          isPick: true,
          heroId,
          isRadiant: index < 5,
        })),
      },
    },
    valve: {
      status: 'ready',
      matchPatch: 'test-current-subpatch',
      currentPatch: 'test-current-subpatch',
      isCurrentExactPatch: true,
    },
    baseline: {
      status: 'ready',
      heroId: 90,
      position: 'POSITION_5',
      bracket: 'DIVINE',
      weeks: [202635],
      points: [
        { minute: 10, matchCount: 500, cs: 45, dn: 2, xp: 3800, heroDamage: 1800, deaths: 1 },
        { minute: 15, matchCount: 500, cs: 65, dn: 3, xp: 5900, heroDamage: 3400, deaths: 1.5 },
        { minute: 25, matchCount: 500, cs: 105, dn: 4, xp: 9900, heroDamage: 8200, deaths: 2.5 },
        { minute: 30, matchCount: 500, cs: 125, dn: 5, xp: 12000, heroDamage: 11000, deaths: 3 },
      ],
    },
    entityConstants: {
      status: 'ready',
      heroes: Object.fromEntries(heroIds.map((id) => [
        id,
        { id, localized_name: id === 90 ? 'Keeper of the Light' : 'Hero ' + id },
      ])),
      items: {
        force_staff: { id: 102, dname: 'Force Staff' },
        town_portal_scroll: { id: 46, dname: 'Town Portal Scroll' },
      },
      abilityIds: {
        5478: 'keeper_of_the_light_illuminate',
        6001: 'fixture_enemy_spell',
      },
      abilities: {
        keeper_of_the_light_illuminate: { dname: 'Illuminate' },
        fixture_enemy_spell: { dname: 'Fixture Enemy Spell' },
      },
      missing: [],
    },
    generatedAt: '2026-08-28T00:00:00.000Z',
  };
}
~~~

- [ ] **Step 2: Написать schema-инварианты**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';

test('normalizes a full match into schema v2', () => {
  const model = normalizeEvidence(fullMatchFixture());
  assert.equal(model.schemaVersion, '2.0.0');
  assert.equal(model.participants.length, 10);
  assert.equal(model.player.heroName.value, 'Keeper of the Light');
  assert.equal(model.lane.status, 'ready');
  assert.equal(model.lane.opponents.length, 2);
  assert.ok(model.lane.opponents.every((row) => row.lane === model.lane.selectedLane));
  assert.equal(model.deathAnalysis.contexts.length, 3);
  assert.equal(model.deathAnalysis.unresolvedCount, 0);
  assert.equal(model.deathAnalysis.patterns.length, 1);
  assert.equal(model.dataQuality.capabilities.currentPatch, true);
  assert.equal(Object.hasOwn(model.dataQuality, 'gates'), false);
});

test('does not invent lane or tactical death context without STRATZ', () => {
  const input = fullMatchFixture();
  input.stratz = { status: 'unavailable', reason: 'missing_token' };
  const model = normalizeEvidence(input);
  assert.equal(model.lane.status, 'unknown');
  assert.deepEqual(model.lane.opponents, []);
  assert.equal(model.dataQuality.capabilities.allPlayerPositions, false);
  assert.equal(model.dataQuality.capabilities.deathContext, false);
});
~~~

- [ ] **Step 3: Запустить тест и увидеть schema 1.2.0**

~~~powershell
node --test scripts/test/normalize-v2.test.mjs
~~~

Ожидается FAIL на schemaVersion, participants, lane и deathAnalysis.

- [ ] **Step 4: Превратить normalizeEvidence в orchestration**

В imports добавить:

~~~js
import { buildEntityCatalog, entityRef } from './entities.mjs';
import { normalizeParticipants, resolveLaneMatchup } from './lane.mjs';
import { buildDeathAnalysis } from './deaths.mjs';
import { computeCapabilities, qualityFromCapabilities } from './capabilities.mjs';
~~~

Изменить SCHEMA_VERSION на 2.0.0 и signature:

~~~js
export function normalizeEvidence({
  matchId,
  accountId,
  openDota,
  stratz,
  valve,
  baseline,
  entityConstants,
  generatedAt,
} = {}) {
~~~

Порядок сборки:

1. Разрешить selected OpenDota/STRATZ player как сейчас.
2. Построить catalog из entityConstants.
3. Нормализовать participants из всех available players.
4. Получить lane через resolveLaneMatchup.
5. Сохранить существующий selected eventTimeline и repositions.
6. Построить deathAnalysis из всех STRATZ playback rows, OpenDota teamfights, selected repositions и summary.deaths.value.
7. Разрешить player.heroName и draft refs.
8. Собрать model без dataQuality.
9. computeCapabilities(model), затем qualityFromCapabilities.

Новая форма ключевых полей:

~~~js
player: {
  accountId: sourced(accountId, openPlayer ? 'opendota' : 'stratz'),
  heroId,
  heroName: sourced(entityRef(catalog, 'hero', heroId.value).name, 'opendota_constants'),
  side,
  position,
  lane: sourced(lane.selectedLane, lane.status === 'ready' ? 'stratz' : null),
  rank,
  kills,
  deaths,
  assists,
  result,
},
participants,
lane,
deathAnalysis,
~~~

Draft radiant/dire заменить на sourced entity refs либо отдельные { id, name } refs с source на уровне pick; выбрать одну форму и применить её одинаково в normalize/report/tests. Рекомендуемая форма:

~~~js
{ value: { id: 90, name: 'Keeper of the Light' }, source: 'stratz' }
~~~

Удалить старый lane.opponentHeroIds и dataQualityFor. Не переносить широкий event_ready под новым именем.

- [ ] **Step 5: Запустить весь unit suite**

~~~powershell
node --test scripts/test/entities.test.mjs scripts/test/lane.test.mjs scripts/test/deaths-context.test.mjs scripts/test/deaths-patterns.test.mjs scripts/test/capabilities.test.mjs scripts/test/normalize-v2.test.mjs
~~~

Ожидается полный PASS.

- [ ] **Step 6: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/*.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/normalize.mjs scripts/test/fixtures.mjs scripts/test/normalize-v2.test.mjs
git commit -m "feat: emit dota coach evidence schema v2"
~~~

---

### Task 9: Проецировать и показывать schema v2 без повторных игровых выводов

**Files:**

- Modify: scripts/lib/report.mjs
- Create: scripts/test/report-v2.test.mjs

- [ ] **Step 1: Написать projection-тесты**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { projectArtifact, renderEvidenceMarkdown } from '../lib/report.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { fullMatchFixture } from './fixtures.mjs';

test('projection preserves names, lane opponents, death contexts and null observations', () => {
  const model = normalizeEvidence(fullMatchFixture());
  model.deathAnalysis.contexts[0].observations.isolated = null;
  model.deathAnalysis.contexts[0].unavailable.push('participant_positions');
  const artifact = projectArtifact(model);
  assert.equal(artifact.schemaVersion, '2.0.0');
  assert.equal(artifact.participants.length, 10);
  assert.equal(artifact.lane.opponents.length, 2);
  assert.equal(artifact.deathAnalysis.contexts[0].observations.isolated, null);
  assert.equal(artifact.dataQuality.capabilities.deathContext, model.dataQuality.capabilities.deathContext);
});

test('report uses entity names and exposes unavailable data without inventing a cause', () => {
  const model = normalizeEvidence(fullMatchFixture());
  const markdown = renderEvidenceMarkdown(projectArtifact(model));
  assert.match(markdown, /Keeper of the Light/);
  assert.match(markdown, /Death contexts/);
  assert.doesNotMatch(markdown, /opponentHeroIds|event_ready|draft_ready/);
});
~~~

- [ ] **Step 2: Подтвердить падение на отсутствующем export и старой схеме**

~~~powershell
node --test scripts/test/report-v2.test.mjs
~~~

Ожидается FAIL: projectArtifact не экспортирован либо v2 sections отсутствуют.

- [ ] **Step 3: Сделать projection единственным местом сериализации**

Переименовать normalizedArtifactModel в export function projectArtifact. В writeArtifacts вызывать только projectArtifact.

Проецировать:

- sources: opendota, stratz, valve, entityConstants;
- player.heroName;
- participants: ровно десять записей;
- lane.selectedLane/opponents/status/reason;
- entity refs только через projectEntityRef;
- deathAnalysis.contexts/patterns/priorityDeathTime/unresolvedCount;
- dataQuality.capabilities с camelCase keys;
- null как null, не false и не строка insufficient data внутри JSON.

Пример helper:

~~~js
function projectEntityRef(value) {
  return {
    id: Number.isSafeInteger(value?.id) ? value.id : null,
    name: typeof value?.name === 'string' && value.name.trim() ? value.name : null,
  };
}
~~~

Удалить lines, которые пересчитывают projectedEventReady. report.mjs не имеет права менять capability, полученный от normalize.

- [ ] **Step 4: Обновить evidence Markdown**

Секции:

1. Request and sources.
2. Match and selected player с hero name.
3. Participants and actual lane opponents.
4. Phases и baseline.
5. Death contexts: одна строка на каждую timed death с facts, observations и unavailable.
6. Death patterns и priority time.
7. Capabilities, missing, warnings.

Entity display:

~~~js
function entityLabel(ref) {
  if (ref?.name) return ref.name;
  if (Number.isSafeInteger(ref?.id)) return 'unknown entity (id ' + ref.id + ')';
  return 'unavailable';
}
~~~

Это evidence inventory, поэтому unknown ID допустим здесь. Финальный coaching review должен использовать имя либо нейтральное unknown entity без показа внутренних полей.

- [ ] **Step 5: Запустить report и normalize suite**

~~~powershell
node --test scripts/test/normalize-v2.test.mjs scripts/test/report-v2.test.mjs
~~~

Ожидается полный PASS.

- [ ] **Step 6: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/*.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/lib/report.mjs scripts/test/report-v2.test.mjs
git commit -m "feat: project dota coach schema v2 safely"
~~~

---

### Task 10: Подключить constants к обоим normalize-pass и покрыть error paths

**Files:**

- Modify: scripts/analyze-match.mjs
- Create: scripts/test/analyze-match-v2.test.mjs

- [ ] **Step 1: Написать orchestration-тесты**

С injected dependencies проверить:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisError, runAnalysis } from '../analyze-match.mjs';

test('passes one constants result into both normalize passes', async () => {
  const seen = [];
  const constants = { status: 'ready', heroes: {}, items: {}, abilityIds: {}, abilities: {}, missing: [] };
  const dependencies = {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 1, players: [] } }),
      loadEntityConstants: async () => constants,
    },
    stratzClient: { loadMatch: async () => ({ status: 'ready', match: { startDateTime: 1, players: [] } }) },
    valveClient: { resolvePatch: async () => ({ status: 'ready', isCurrentExactPatch: true, currentPatch: 'test-current-subpatch' }) },
    baselineClient: { loadPeerBaseline: async () => ({ status: 'unavailable', reason: 'fixture' }) },
    normalize: (input) => {
      seen.push(input.entityConstants);
      return {
        generatedAt: input.generatedAt,
        player: { heroId: { value: null }, position: { value: null }, rank: { value: null } },
        match: { averageRank: { value: null } },
      };
    },
    write: async () => ({ jsonPath: 'x.json', markdownPath: 'x.md' }),
  };
  await runAnalysis({ matchId: 1, accountId: 10 }, dependencies);
  assert.equal(seen.length, 2);
  assert.ok(seen.every((value) => value === constants));
});

test('rejects an old patch before constants lookup and before writing', async () => {
  let constantsCalls = 0;
  let writes = 0;
  const dependencies = {
    openDotaClient: {
      loadMatch: async () => ({ status: 'ready', match: { start_time: 1 } }),
      loadEntityConstants: async () => { constantsCalls += 1; return { status: 'ready', heroes: {} }; },
    },
    stratzClient: { loadMatch: async () => ({ status: 'unavailable', reason: 'missing_token' }) },
    valveClient: { resolvePatch: async () => ({ status: 'ready', isCurrentExactPatch: false }) },
    normalize: () => assert.fail('normalize must not run'),
    write: async () => { writes += 1; },
  };
  await assert.rejects(
    runAnalysis({ matchId: 1, accountId: 10 }, dependencies),
    (error) => error instanceof AnalysisError && error.code === 'unsupported_patch',
  );
  assert.equal(constantsCalls, 0);
  assert.equal(writes, 0);
});
~~~

Также добавить тесты:

- hero selector использует constants.heroes и selector conflict остаётся code 2;
- partial constants не останавливают account-id анализ, имена неизвестных сущностей остаются null;
- missing STRATZ token создаёт разрешённый degraded model без deathContext;
- partial playback сохраняет unresolvedCount и unavailable;
- ambiguous hero не вызывает write.

- [ ] **Step 2: Запустить orchestration-тесты**

~~~powershell
node --test scripts/test/analyze-match-v2.test.mjs
~~~

Ожидается FAIL: loadEntityConstants не вызывается и entityConstants не передаётся normalize.

- [ ] **Step 3: Изменить runAnalysis**

После current exact patch guard:

~~~js
const entityConstants = await openDotaClient.loadEntityConstants();

let accountId = options.accountId ?? null;
if (options.heroName != null) {
  if (!entityConstants?.heroes || Object.keys(entityConstants.heroes).length === 0) {
    throw new AnalysisError('hero_lookup_unavailable');
  }
  const selected = resolveAccountIdByHero({
    heroName: options.heroName,
    heroConstants: entityConstants.heroes,
    openDota,
    stratz,
  });
  if (accountId != null && accountId !== selected.accountId) {
    throw new AnalysisError('selector_conflict');
  }
  accountId = selected.accountId;
}
~~~

В оба normalize вызова добавить entityConstants. Не загружать constants повторно перед baseline pass. В CLI status вывести entityConstants status, но не missing payload и не сырой error.

- [ ] **Step 4: Запустить все offline-тесты**

~~~powershell
node --test scripts/test/*.test.mjs
~~~

Live smoke пока должен быть skip без переменной окружения; все остальные тесты PASS.

- [ ] **Step 5: Создать checkpoint/commit**

~~~powershell
node --test scripts/test/*.test.mjs
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add scripts/analyze-match.mjs scripts/test/analyze-match-v2.test.mjs
git commit -m "feat: wire entity constants into match analysis"
~~~

---

### Task 11: Зафиксировать coaching contract и death-analysis policy

**Files:**

- Modify: SKILL.md
- Modify: references/runtime.md
- Modify: references/source-policy.md
- Modify: references/review-template.md
- Modify: references/decision-stack.md
- Create: references/death-analysis.md
- Modify only if needed: agents/openai.yaml
- Create: scripts/test/skill-contract.test.mjs

- [ ] **Step 1: Написать contract-тест до изменения документов**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (name) => readFile(new URL(name, new URL('../../', import.meta.url)), 'utf8');

test('review contract contains the five first-screen blocks and all-death rule', async () => {
  const template = await read('references/review-template.md');
  for (const heading of ['Матч', 'Главный вывод', 'Смерти', 'Переломный момент', 'Упражнение']) {
    assert.match(template, new RegExp(heading, 'u'));
  }
  assert.match(template, /500.?900/u);
  assert.match(template, /все смерти|каждая смерть/u);
  assert.match(template, /не более двух стадий/u);
});

test('skill permanently excludes historical patches and requires neutral address', async () => {
  const skill = await read('SKILL.md');
  const policy = await read('references/source-policy.md');
  assert.match(skill + policy, /стар(ые|ых) патч/u);
  assert.match(skill + policy, /не входит.*roadmap|никогда не поддерж/u);
  assert.match(skill + policy, /нейтральн/u);
});

test('death policy defines windows, null semantics and forbidden claims', async () => {
  const deathPolicy = await read('references/death-analysis.md');
  assert.match(deathPolicy, /15 секунд до/u);
  assert.match(deathPolicy, /5 секунд после/u);
  assert.match(deathPolicy, /null/u);
  assert.match(deathPolicy, /намерени|обзор|кулдаун/u);
});
~~~

- [ ] **Step 2: Запустить contract-тест**

~~~powershell
node --test scripts/test/skill-contract.test.mjs
~~~

Ожидается FAIL: death-analysis.md отсутствует, текущий template не содержит новый first screen.

- [ ] **Step 3: Сократить SKILL.md до routing и invariants**

SKILL.md обязан оставить:

- trigger: current-patch review по match ID + account ID или hero;
- runtime-first workflow;
- проверку dataQuality.capabilities;
- обязательный анализ всех смертей;
- нейтральное «игрок на Hero» при hero-only selector;
- второе лицо только при явном подтверждении собственности матча;
- текущий exact subpatch only;
- фразу: «Поддержка старых патчей не реализуется и не входит в будущий roadmap этого навыка»;
- ссылки на runtime.md, source-policy.md, death-analysis.md, decision-stack.md и review-template.md.

Не дублировать в SKILL.md полный allowlist и длинное описание schema.

- [ ] **Step 4: Написать references/death-analysis.md как нормативный контракт**

Обязательные разделы:

1. Window and inputs.
2. Position freshness and radius.
3. Observable flags.
4. Defensive item allowlist.
5. true / false / null semantics.
6. Patterns in this match.
7. Priority death.
8. Facts / supported hypothesis / unavailable.
9. Forbidden causal language.

Точный смысл:

- окно -15/+5;
- position age ≤3 seconds;
- radius 20 minimap cells;
- trade window ±10;
- defensive use window -5..0;
- named allowlist из design spec;
- пассивный Aeon Disk не считается item use;
- contextIncomplete не участвует в signature;
- pattern только от 2 одинаковых непустых confirmed-true signatures;
- никакой формулировки «ты не видел», «способность была готова», «точно мог спастись».

- [ ] **Step 5: Переписать review-template.md под сбалансированный ответ**

First screen без таблицы и именно в этом порядке:

~~~markdown
## Матч

Одна строка: герой, роль/позиция, результат, длительность и K/D/A.

## Главный вывод

Один доказуемый приоритет: repeated death pattern, peer deviation или подтверждённое efficiency event.

## Смерти

Краткий итог всех смертей и одна priority death: факты, поддерживаемая гипотеза, unavailable.

## Переломный момент

Один подтверждённый эпизод; если данных нет, это прямо сказано.

## Упражнение

Одно измеримое действие. Числовая цель только из готового peer baseline с минутой и sample size.
~~~

Нижняя часть:

- одна таблица максимум с двумя стадиями;
- compact rows остальных смертей;
- если строк больше пяти — пять информативных строк + одна строка с оставшимися timecodes;
- draft/task/items;
- data limitations только если они реально меняют вывод;
- общий ориентир 500–900 слов.

- [ ] **Step 6: Обновить runtime/source-policy/decision-stack**

runtime.md:

~~~powershell
.\scripts\analyze-match.ps1 -MatchId 8970339828 -Hero 'Keeper of the Light' -ParseTimeoutMs 120000 -OutputDir .\output
.\scripts\analyze-match.ps1 -MatchId 8970339828 -AccountId 123456 -ParseTimeoutMs 120000 -OutputDir .\output
~~~

Документировать schemaVersion 2.0.0, participants, lane, deathAnalysis и dataQuality.capabilities. Удалить рекомендации передавать GNU flags PowerShell wrapper.

source-policy.md:

- fact только из artifact;
- supported hypothesis всегда маркируется;
- unknown/null никогда не пересказывается как false;
- entity name null не угадывается;
- current exact patch guard обязателен.

decision-stack.md:

1. largest repeated death pattern;
2. largest relevant peer mean deviation;
3. confirmed event changing personal efficiency;
4. если ни один слой не доступен — ограниченный factual review.

- [ ] **Step 7: Проверить agents/openai.yaml**

Изменять только если current default prompt:

- допускает обращение «ты» без ownership;
- не требует учитывать все смерти;
- ссылается на dataQuality.gates.

Если ни одно условие не выполняется, оставить файл без изменений и записать это в checkpoint.

- [ ] **Step 8: Запустить contract и offline suite**

~~~powershell
node --test scripts/test/skill-contract.test.mjs
node --test scripts/test/*.test.mjs
~~~

Ожидается полный PASS.

- [ ] **Step 9: Создать checkpoint/commit**

~~~powershell
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git:

~~~powershell
git add SKILL.md references agents/openai.yaml scripts/test/skill-contract.test.mjs
git commit -m "docs: define balanced death-focused coaching contract"
~~~

---

### Task 12: Добавить live smoke и выполнить release verification

**Files:**

- Create: scripts/test/live-smoke.test.mjs
- Modify: references/runtime.md
- Verify: all runtime, tests and references above

- [ ] **Step 1: Написать opt-in live smoke**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runAnalysis } from '../analyze-match.mjs';
import { createOpenDotaClient } from '../lib/opendota.mjs';
import { createStratzClient } from '../lib/stratz.mjs';
import { createValveClient } from '../lib/valve.mjs';
import { createBaselineClient } from '../lib/baseline.mjs';
import { normalizeEvidence } from '../lib/normalize.mjs';
import { writeArtifacts } from '../lib/report.mjs';

const matchId = Number(process.env.DOTA2_COACH_LIVE_MATCH_ID);
const accountId = Number(process.env.DOTA2_COACH_LIVE_ACCOUNT_ID);
const heroName = process.env.DOTA2_COACH_LIVE_HERO?.trim() || null;
const enabled = Number.isSafeInteger(matchId) && matchId > 0
  && ((Number.isSafeInteger(accountId) && accountId > 0) || heroName != null);

test('live current-patch match emits a valid v2 artifact', { skip: !enabled, timeout: 180000 }, async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'dota2-coach-live-'));
  try {
    const result = await runAnalysis({
      matchId,
      accountId: Number.isSafeInteger(accountId) && accountId > 0 ? accountId : null,
      heroName,
      parseTimeoutMs: 120000,
      outputDir,
    }, {
      openDotaClient: createOpenDotaClient(),
      stratzClient: createStratzClient({ apiKey: process.env.STRATZ_API_KEY }),
      valveClient: createValveClient(),
      baselineClient: createBaselineClient({ apiKey: process.env.STRATZ_API_KEY }),
      normalize: normalizeEvidence,
      write: writeArtifacts,
    });
    const artifact = JSON.parse(await readFile(result.artifacts.jsonPath, 'utf8'));
    assert.equal(artifact.schemaVersion, '2.0.0');
    assert.equal(artifact.participants.length, 10);
    assert.equal(artifact.dataQuality.capabilities.currentPatch, true);
    assert.equal(artifact.deathAnalysis.contexts.length + artifact.deathAnalysis.unresolvedCount, artifact.player.deaths.value);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
~~~

Тест обязан skip, если нет match ID. Никакого постоянного match ID в репозитории.

- [ ] **Step 2: Запустить syntax checks**

~~~powershell
$modules = Get-ChildItem -LiteralPath scripts -Recurse -Filter *.mjs
foreach ($module in $modules) {
  node --check $module.FullName
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($module.FullName)" }
}
~~~

Ожидается exit 0 для каждого файла.

- [ ] **Step 3: Запустить полный offline suite дважды**

~~~powershell
node --test scripts/test/*.test.mjs
node --test scripts/test/*.test.mjs
~~~

Ожидается одинаковый PASS; live smoke отмечен SKIP без env. Двойной запуск ловит временные файлы, глобальное состояние и недетерминированную сортировку.

- [ ] **Step 4: Проверить negative guarantees**

~~~powershell
rg -n "opponentHeroIds|event_ready|draft_ready|baseline_ready|ValueFromRemainingArguments" scripts SKILL.md references
rg -n "стар.*патч|historical patch|roadmap" SKILL.md references
rg -n "contextIncomplete|priorityDeathTime|unresolvedCount|capabilities" scripts references
~~~

Ожидается:

- первый поиск не находит production references старой schema; упоминание допустимо только в regression tests;
- второй находит явный постоянный запрет поддержки старых патчей;
- третий находит runtime, projection, tests и docs.

- [ ] **Step 5: Выполнить live smoke на свежем публичном матче**

~~~powershell
if (-not $env:DOTA2_COACH_LIVE_MATCH_ID) { throw 'Set DOTA2_COACH_LIVE_MATCH_ID to a fresh current-subpatch public match.' }
if (-not $env:DOTA2_COACH_LIVE_ACCOUNT_ID -and -not $env:DOTA2_COACH_LIVE_HERO) {
  throw 'Set DOTA2_COACH_LIVE_ACCOUNT_ID or DOTA2_COACH_LIVE_HERO for that match.'
}
node --test scripts/test/live-smoke.test.mjs
Remove-Item Env:DOTA2_COACH_LIVE_MATCH_ID
Remove-Item Env:DOTA2_COACH_LIVE_ACCOUNT_ID -ErrorAction SilentlyContinue
Remove-Item Env:DOTA2_COACH_LIVE_HERO -ErrorAction SilentlyContinue
~~~

Перед запуском задать переменные окружения значениями реально свежего матча текущего exact subpatch; эти значения не сохранять в файлы. Если STRATZ token отсутствует, сначала выполнить account-id smoke в degraded mode и отдельно отметить, что полный death-context gate не проверен. Полный release gate требует один запуск с STRATZ.

- [ ] **Step 6: Ручная проверка двух Windows-команд**

~~~powershell
.\scripts\analyze-match.ps1 -MatchId $env:DOTA2_COACH_LIVE_MATCH_ID -AccountId $env:DOTA2_COACH_LIVE_ACCOUNT_ID -ParseTimeoutMs 120000 -OutputDir .\output-smoke
.\scripts\analyze-match.ps1 -MatchId $env:DOTA2_COACH_LIVE_MATCH_ID -Hero $env:DOTA2_COACH_LIVE_HERO -ParseTimeoutMs 120000 -OutputDir .\output-smoke
~~~

Проверить:

- обе команды доходят до Node без AccountId conversion error;
- JSON v2 содержит 10 participants;
- lane opponents содержит 1–3 совпадающих физических lane players либо честный unknown;
- contexts + unresolvedCount равно scoreboard deaths;
- entity names отображаются, неизвестные остаются null;
- old-patch fixture по-прежнему отказывает до write;
- evidence Markdown не меняет capabilities.

- [ ] **Step 7: Проверить сбалансированный пользовательский ответ вручную**

На live artifact сформировать один русский coaching review и проверить:

- первый экран — пять утверждённых блоков без таблицы;
- общий объём 500–900 слов;
- одна priority death подробно;
- все остальные смерти присутствуют компактно;
- таблица содержит не больше двух стадий;
- факты, гипотеза и unavailable различимы;
- second person отсутствует, если матч задан только героем;
- ID не заменяют имена в пользовательском тексте;
- числовая цель упражнения существует только при ready peer comparison.

- [ ] **Step 8: Финальный checkpoint/commit**

~~~powershell
node --test scripts/test/*.test.mjs
git -C $skillRoot status --short
git -C $skillRoot rev-parse --is-inside-work-tree
~~~

Если доступен Git и status содержит только изменения этого плана:

~~~powershell
git add scripts/test/live-smoke.test.mjs references/runtime.md
git commit -m "test: verify dota coach v2 release contract"
~~~

Если Git недоступен, сохранить в handoff: точную команду теста, число passed/skipped, путь live artifact и незакрытые capabilities. Не объявлять релиз готовым без полного offline PASS и успешного current-patch smoke.

---

## Final Acceptance Checklist

- [ ] Windows hero/account commands используют только явные PowerShell-параметры.
- [ ] schemaVersion равен 2.0.0.
- [ ] participants всегда содержит десять slots.
- [ ] hero/item/ability refs имеют { id, name } и безопасный null fallback.
- [ ] lane opponents никогда не равен всей вражеской команде.
- [ ] Каждая timed death имеет context; недостающие timed deaths отражены unresolvedCount.
- [ ] true, false и null observations имеют разный смысл и сохраняются projection.
- [ ] Repeated pattern требует минимум две одинаковые непустые confirmed signatures.
- [ ] Один широкий event gate удалён; capabilities независимы.
- [ ] report.mjs не пересчитывает игровые факты или capabilities.
- [ ] Первый экран, компактные остальные смерти и лимит двух стадий закреплены contract-тестом.
- [ ] Второе лицо используется только при явном ownership.
- [ ] Старые патчи отклоняются до constants/normalize/write и навсегда исключены из roadmap.
- [ ] Offline suite детерминированно проходит дважды.
- [ ] Live smoke проходит на свежем матче текущего exact subpatch.

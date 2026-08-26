# Dota 2 Match Coach — «Выше контекста»

[Русский](#русский) · [English](#english)

## Русский

Codex-скилл для доказательного разбора матча Dota 2 по `match_id`; игрок выбирается по `account_id` или точному имени героя. Перед тренерской интерпретацией встроенный runtime собирает OpenDota, STRATZ и официальный Valve patch timeline, нормализует данные с provenance и открывает только подтверждённые data gates.

Проект ориентирован только на последний точный подпатч. Старые или не подтверждённые по Valve timeline матчи не создают success-артефакт.

## Что уже умеет

- parse-first сбор OpenDota с сохранением базового scoreboard при недоступном replay;
- STRATZ GraphQL с обязательным `User-Agent: STRATZ_API`;
- проверка последнего точного подпатча через Valve timeline;
- Radiant/Dire draft, lane outcome, итоговые метрики, покупки и инвентарь;
- четыре стадии матча, временные ряды и extrema внутри матча;
- allowlisted timeline событий и teamfights с проверкой границ duration;
- явные source conflicts с сохранением альтернатив и provenance;
- детерминированные JSON/Markdown-артефакты и безопасные CLI-ошибки;
- PowerShell и POSIX wrappers без npm-зависимостей.
- выбор игрока по точному английскому имени героя для разбора чужих матчей;
- автоматический русский или английский язык полного тренерского ответа по языку пользователя.

Сбор role/rank/patch baseline и глубокий разбор сырого `.dem` намеренно не входят в runtime v1. Без baseline нельзя выдавать нормативный вердикт по роли; без `.dem` нельзя достоверно объяснять каждый input или пропущенного крипа.

Следующие этапы — статистическая модель пика, baseline сильных игроков и глубокий `.dem`-анализ — зафиксированы в [ROADMAP.md](ROADMAP.md).

## Требования

- Node.js 18+;
- сетевой доступ к OpenDota, STRATZ и Valve;
- PowerShell на Windows либо POSIX `sh` на macOS/Linux;
- рекомендуемый `STRATZ_API_KEY` для STRATZ position/lane/playback enrichment; без него скилл явно работает в degraded mode.

`npm install` и `package.json` не нужны.

## Установка

Установите скилл глобально для Codex через [Vercel Skills](https://github.com/vercel-labs/skills):

```sh
npx skills add atlonis/dota2-coach-skill --skill dota2-match-coach --agent codex --global --copy --yes
```

Проверьте установку:

```sh
npx skills list --global --agent codex
```

После установки откройте новую сессию Codex и попросите:

```text
Используй $dota2-match-coach и разбери матч 8963363814 для account_id 56386500.
```

Для чужого матча можно выбрать игрока по герою:

```text
Используй $dota2-match-coach и разбери игрока на Earth Spirit в матче 8963363814.
```

### Язык ответа

Скилл отвечает по-русски на русский запрос и по-английски на английский. Явное указание языка имеет приоритет; в смешанном диалоге используется язык последнего содержательного сообщения. Локализуются заголовки, стадийный разбор, ограничения данных, STRATZ-уведомления и action plan. Названия героев и предметов, API, JSON/schema keys, data gates и error codes остаются без перевода.

Скилл сам выберет платформенный runtime, соберёт данные и проверит data gates до начала разбора. Для STRATZ enrichment задайте `STRATZ_API_KEY` в среде Codex. Это открывает position/lane/playback, но автоматический baseline появится на следующем этапе. Настройка токена, schema, exit codes и troubleshooting описаны в [runtime contract](dota2-match-coach/references/runtime.md); не добавляйте токен в команды, файлы или Git.

## Обновление и удаление

```sh
npx skills update dota2-match-coach --global --yes
npx skills remove dota2-match-coach --global --agent codex --yes
```

## Data gates

Runtime записывает `dataQuality.gates`:

- `scoreboard` — доступны базовые факты матча;
- `phase_aggregates` — доступны наблюдаемые фазовые метрики;
- `draft_ready` — известны пять героев Radiant и пять Dire;
- `event_ready` — сохранён пригодный временной ряд событий;
- `baseline_ready` — доступна релевантная нормативная выборка;
- `current_patch` — подтверждён последний точный подпатч.

Закрытый gate запрещает соответствующий тип вывода. Например, без `event_ready` нельзя придумывать причину конкретного эпизода, а без `baseline_ready` — называть показатель хорошим или плохим относительно роли/rank/patch.

## Проверка

Из корня репозитория:

```sh
node --test dota2-match-coach/test/runtime/*.test.mjs
```

Текущий offline-suite содержит 107 тестов и не требует сети. POSIX wrapper статически проверяется на Windows; полноценный запуск на macOS/Linux остаётся задачей CI или соответствующего хоста.

## Структура

```text
dota2-match-coach/
  SKILL.md                 инструкции скилла
  agents/openai.yaml       метаданные Codex
  references/              runtime, source policy и review template
  scripts/                 runtime и платформенные wrappers
  test/runtime/            offline node:test suite
docs/superpowers/          design spec и implementation plan
RESEARCH.md                исследование источников и решений
```

Локальные `output/`, секреты и процессные `.superpowers/`-артефакты не входят в репозиторий.

## Политика источников

OpenDota служит основным источником match object и parse job; STRATZ добавляет position/lane/playback enrichment; Valve подтверждает точный текущий подпатч. Dota2ProTracker, старый Fandom и Valve `GetMatchDetails` не являются runtime-зависимостями. Полные правила находятся в [source policy](dota2-match-coach/references/source-policy.md).

## English

Dota 2 Match Coach is an evidence-based Codex skill for reviewing a current-patch match by `match_id`. The player can be selected by `account_id` or by their hero's exact English name. The bundled runtime collects OpenDota, STRATZ, and Valve patch-timeline data before the coaching interpretation and exposes only conclusions allowed by the available data gates.

### Features

- OpenDota parse-first collection with scoreboard fallback;
- STRATZ position, lane, and playback enrichment;
- exact current-subpatch verification through Valve;
- draft, lane outcome, item build, four game stages, time series, and bounded events;
- explicit source conflicts, provenance, and degraded mode;
- automatic Russian or English user-facing reviews;
- dependency-free Node.js 18+ runtime with PowerShell and POSIX wrappers.

Role/rank/patch baselines, a statistical draft model, and raw `.dem` micro-analysis are planned rather than implemented. See [ROADMAP.md](ROADMAP.md).

### Install

Install globally for Codex with [Vercel Skills](https://github.com/vercel-labs/skills):

```sh
npx skills add atlonis/dota2-coach-skill --skill dota2-match-coach --agent codex --global --copy --yes
```

Start a new Codex session and ask:

```text
Use $dota2-match-coach to analyze match 8963363814 for account_id 56386500.
```

Or select a player in someone else's match by hero:

```text
Use $dota2-match-coach to analyze the Earth Spirit player in match 8963363814.
```

### Language

The complete user-facing review follows the user's language: a Russian request produces Russian output and an English request produces English output. An explicit language request overrides detection; mixed-language conversations follow the last substantive user message. Hero and item names, APIs, JSON/schema keys, data gates, and error codes remain unchanged.

### Data and validation

Set `STRATZ_API_KEY` in the Codex environment for richer position/lane/playback data. Never place the token in prompts, commands, repository files, or Git. Without it, the skill explains the missing enrichment and continues in degraded OpenDota mode.

The offline suite contains 107 tests and needs no network access:

```sh
node --test dota2-match-coach/test/runtime/*.test.mjs
```

The runtime contract is documented in [runtime.md](dota2-match-coach/references/runtime.md), source rules in [source-policy.md](dota2-match-coach/references/source-policy.md), and the coaching format in [review-template.md](dota2-match-coach/references/review-template.md).

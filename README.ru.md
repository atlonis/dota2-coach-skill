# Dota 2 Match Coach

[English](README.md) | [Русский](README.ru.md)

Агентский скилл для доказательного разбора матча Dota 2 текущего патча по `match_id`. Игрок выбирается по `account_id` или точному английскому имени героя. Перед тренерской интерпретацией встроенный runtime собирает OpenDota, STRATZ и официальный Valve patch timeline, нормализует данные с provenance и открывает только подтверждённые data gates.

Проект ориентирован только на последний точный подпатч. Старые или не подтверждённые по Valve timeline матчи не создают success-артефакт.

## Возможности

- parse-first сбор OpenDota с сохранением базового scoreboard при недоступном replay;
- STRATZ GraphQL с обязательным `User-Agent: STRATZ_API`;
- проверка последнего точного подпатча через Valve timeline;
- Radiant/Dire draft, lane outcome, итоговые метрики, покупки и инвентарь;
- четыре стадии матча, временные ряды и extrema внутри матча;
- allowlisted timeline событий и teamfights с проверкой границ duration;
- явные source conflicts с сохранением альтернатив и provenance;
- детерминированные JSON/Markdown-артефакты и безопасные CLI-ошибки;
- PowerShell и POSIX wrappers без npm-зависимостей;
- выбор игрока по точному английскому имени героя для разбора чужих матчей;
- автоматический русский или английский язык полного тренерского ответа.

Глубокий разбор сырого `.dem` намеренно не входит в runtime v1: без него нельзя достоверно объяснять каждый input или пропущенного крипа. Baseline, который собирает runtime, — это выборка того же героя, позиции и bracket на текущем патче, и она даёт среднее с размером выборки, а не перцентиль.

Статистическая модель пика, self-baseline и baseline сильных игроков, а также глубокий `.dem`-анализ зафиксированы в [ROADMAP.md](ROADMAP.md).

## Требования

- Node.js 18+;
- сетевой доступ к OpenDota, STRATZ и Valve;
- PowerShell на Windows либо POSIX `sh` на macOS/Linux;
- рекомендуемый `STRATZ_API_KEY` для STRATZ position/lane/playback enrichment.

`npm install` и `package.json` не нужны.

## Установка

Установите скилл глобально через [Vercel Skills](https://github.com/vercel-labs/skills). CLI предложит выбрать, в какого обнаруженного агента или агентов его добавить:

```sh
npx skills add atlonis/dota2-coach-skill --skill dota2-match-coach --global --copy
```

Проверьте установку:

```sh
npx skills list --global
```

После установки откройте новую сессию выбранного агента и попросите:

```text
Используй $dota2-match-coach и разбери матч 8963363814 для account_id 56386500.
```

Для чужого матча можно выбрать игрока по герою:

```text
Используй $dota2-match-coach и разбери игрока на Earth Spirit в матче 8963363814.
```

Скилл сам выберет платформенный runtime, соберёт данные и проверит data gates до начала разбора. Для расширенных position/lane/playback данных задайте `STRATZ_API_KEY` в среде выбранного агента. Токен нужен и для peer baseline, но не гарантирует его: должны быть известны позиция и ранг — медаль самого игрока либо средний bracket матча как запасное основание и хотя бы одна неделя целиком внутри текущего патча. Настройка токена, schema, exit codes и troubleshooting описаны в [runtime contract](dota2-match-coach/references/runtime.md). Не добавляйте токен в запросы, команды, файлы проекта или Git.

## Язык ответа

Полный пользовательский ответ следует языку пользователя: русский запрос даёт русский разбор, английский — английский. Явное указание языка имеет приоритет; в смешанном диалоге используется язык последнего содержательного сообщения.

Локализуются заголовки, стадии, ограничения данных, STRATZ-уведомления и action plan. Названия героев и предметов, API, JSON/schema keys, data gates и error codes остаются без перевода.

## Обновление и удаление

```sh
npx skills update dota2-match-coach --global --yes
npx skills remove dota2-match-coach --global
```

## Data gates

Runtime записывает `dataQuality.gates`:

- `scoreboard` — доступны базовые факты матча;
- `phase_aggregates` — доступны наблюдаемые фазовые метрики;
- `draft_ready` — известны пять героев Radiant и пять Dire;
- `event_ready` — сохранён пригодный временной ряд событий;
- `baseline_ready` — доступна выборка того же героя, позиции и bracket на текущем патче;
- `current_patch` — подтверждён последний точный подпатч.

Закрытый gate запрещает соответствующий тип вывода. Например, без `event_ready` нельзя придумывать причину конкретного эпизода, а без `baseline_ready` — называть показатель хорошим или плохим относительно роли/rank/patch.

## Проверка

Из корня репозитория:

```sh
node --test test/runtime/*.test.mjs
```

Текущий offline-suite содержит 151 тест и не требует сети. Каждый wrapper запускается только на своей платформе: на macOS и Linux выполняется POSIX-скрипт, на Windows — PowerShell, а неприменимый на текущем хосте тест штатно пропускается. Оба wrapper дополнительно проверяются статически на всех платформах.

## Структура репозитория

```text
dota2-match-coach/          устанавливаемый бандл скилла
  SKILL.md                 инструкции скилла
  agents/openai.yaml       OpenAI-совместимые UI-метаданные
  references/              runtime, source policy, review template и стек решений
  scripts/                 runtime и платформенные wrappers
test/runtime/              offline node:test suite
docs/superpowers/          design spec и implementation plan
RESEARCH.md                исследование источников и решений
ROADMAP.md                 функции, предусмотренные data gates, но ещё не собираемые runtime
```

Локальные `output/`, секреты и процессные `.superpowers/`-артефакты не входят в репозиторий.

## Политика источников

OpenDota служит основным источником match object и parse job; STRATZ добавляет position/lane/playback enrichment; Valve подтверждает точный текущий подпатч. Dota2ProTracker, старый Fandom и Valve `GetMatchDetails` не являются runtime-зависимостями. Полные правила находятся в [source policy](dota2-match-coach/references/source-policy.md).

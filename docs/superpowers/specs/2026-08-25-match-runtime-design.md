# Runtime получения данных матча для «Выше контекста»

Дата: 25 августа 2026 года
Статус: дизайн одобрен в чате, ожидает проверки документа перед реализацией

## Цель

Добавить в bundle `dota2-match-coach` автономный кроссплатформенный runtime, который по `match_id` и селектору игрока (`account_id` или точному английскому имени героя) получает доступные данные OpenDota и STRATZ, нормализует их и создаёт доказательную основу для тренерского разбора.

Runtime работает на Node.js 18+ без npm-пакетов. На macOS/Linux его запускает shell-wrapper, на Windows — PowerShell-wrapper. Вся логика HTTP, GraphQL и JSON находится в общих `.mjs`-модулях.

## Пользовательский контракт

Основные команды:

```bash
./dota2-match-coach/scripts/analyze-match.sh 8963363814 56386500
```

```powershell
./dota2-match-coach/scripts/analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500
```

Прямой кроссплатформенный вызов:

```text
node dota2-match-coach/scripts/analyze-match.mjs --match-id 8963363814 --account-id 56386500
```

Успешный запуск печатает краткую сводку и создаёт:

- `output/<match_id>.json` — нормализованные доказательства;
- `output/<match_id>.md` — детерминированную сводку доступных фактов и ограничений для последующего тренерского ответа.

Сырые ответы API и токен STRATZ на диск не записываются.

## Область первой версии runtime

### Входит

- OpenDota match endpoint и parse-first workflow;
- запрос parse, если replay-derived поля отсутствуют;
- ограниченное ожидание parse job с настраиваемым timeout;
- STRATZ GraphQL enrichment с точным `User-Agent: STRATZ_API`;
- идентификация игрока по `account_id` либо по точному английскому имени героя; при обоих селекторах — обязательная перекрёстная проверка;
- команды, полный пик, роль/позиция и lane outcome, если источники их возвращают;
- итоговые показатели, временные ряды, покупки, kills/deaths, teamfights и доступные playback/event данные;
- разбиение временных рядов на `0–10`, `10–15`, `15–25`, `25+`;
- явный уровень достаточности данных и список отсутствующего контекста;
- degraded mode при частичной недоступности источников.

### Не входит

- скачивание и самостоятельный parse сырого `.dem`;
- реконструкция каждого крипа, его HP и всех input-возможностей;
- LLM-вызов из runtime;
- хранение STRATZ token в файлах проекта;
- глобальная установка скилла;
- анализ матчей не на текущем точном подпатче.

## Архитектура

```text
shell / PowerShell wrapper
          |
          v
analyze-match.mjs
  |-- lib/opendota.mjs  -> match, parse request, job polling
  |-- lib/stratz.mjs    -> GraphQL enrichment
  |-- lib/normalize.mjs -> canonical evidence model and data gates
  |-- lib/report.mjs    -> deterministic Markdown summary
  `-- output/<match_id>.{json,md}
```

Файлы располагаются внутри `dota2-match-coach/scripts/`. Тесты — в `dota2-match-coach/test/` и используют встроенный `node:test` с подменённым `fetch`.

## Поток данных

1. CLI проверяет положительный целый `match_id` и принимает `account_id` либо точное английское имя героя. Для имени героя runtime загружает OpenDota hero constants и разрешает только единственного участника матча; неоднозначность, скрытый account ID и конфликт двух селекторов завершаются безопасной ошибкой.
2. OpenDota загружает match object.
3. Parse-state определяется по `version` и необходимым replay-derived полям, а не по одному наличию `players`.
4. Если данных нет, runtime отправляет parse request, опрашивает job до terminal state или timeout и повторно загружает матч.
5. После получения базового матча runtime запрашивает STRATZ. Заголовки: `Authorization: Bearer <STRATZ_API_KEY>`, `Content-Type: application/json`, `User-Agent: STRATZ_API`.
6. Отсутствующий token означает `stratz.status = unavailable`, а не ошибку всего запуска.
7. Нормализатор объединяет источники, сохраняя provenance каждого поля и не подменяя отсутствующие значения догадками.
8. Определяется data gate: `scoreboard`, `phase_aggregates`, `baseline_ready`, `draft_ready`, `event_ready` или их доступная комбинация.
9. JSON записывается атомарно. Markdown строится только из нормализованной модели.

## Нормализованная модель

Верхний уровень:

```text
schemaVersion
generatedAt
request { matchId, accountId }
sources { opendota, stratz }
match { result, duration, startTime, gameMode, lobbyType, patch }
player { accountId, heroId, side, position, lane, rank }
draft { radiant, dire, complete }
lane { opponentHeroIds, outcome, efficiency }
summary { kda, lh, denies, gpm, xpm, netWorth, heroDamage, towerDamage, healing }
items { purchases, finalInventory }
events { kills, deaths, teamfights, runes, objectives, abilityUses, positions }
series { gold, xp, lh, denies }
phases[] { interval, metrics, extremaWithinMatch }
dataQuality { mode, gates, missing, warnings }
```

Каждое объединённое или спорное поле содержит `source` либо остаётся `null`. Закрытые оценки STRATZ вроде IMP хранятся как дополнительный сигнал, но не определяют вывод.

## Политика источников

- OpenDota — основной источник match object, parse job и открытых replay-derived событий.
- STRATZ — роль/позиция, lane outcome, полный состав и доступный playback/enrichment.
- Если значения конфликтуют, runtime сохраняет оба значения с provenance и предупреждение; он не выбирает «удобное» значение молча.
- Runtime не использует Dota2ProTracker, Fandom или Valve `GetMatchDetails`.
- Проверка текущего точного подпатча использует официальный Valve patch timeline. Если timeline недоступен, patch gate остаётся закрытым и отчёт явно не делает current-patch нормативных выводов.

## Ошибки и degraded mode

Ошибки источников нормализуются в безопасные коды: `network`, `http`, `rate_limited`, `auth`, `graphql`, `invalid_response`, `not_found`, `parse_timeout`, `replay_unavailable`.

- OpenDota `404` завершает запуск как `match_not_found`.
- OpenDota rate limit учитывает `Retry-After`, но не ждёт дольше общего timeout.
- STRATZ `401/403` помечается отдельно; HTML/Cloudflare не пытается разбираться как JSON.
- Недоступный STRATZ не мешает создать OpenDota-only отчёт.
- Нераспарсенный и уже недоступный replay даёт scoreboard/aggregate-only отчёт с закрытыми event gates.
- Никакой обработчик не печатает Authorization header или токен.

## Безопасность и воспроизводимость

- Token читается только из `STRATZ_API_KEY`.
- CLI не принимает token аргументом, чтобы он не попал в shell history.
- Запись результата использует временный файл рядом с целью и rename.
- `generatedAt`, статусы источников и schema version позволяют воспроизвести границы конкретного отчёта.
- Тестовые fixtures синтетические и не содержат пользовательских секретов.

## TDD и проверка

Реализация идёт test-first через встроенный `node:test`:

1. CLI validation и одинаковая передача аргументов из обоих wrappers.
2. OpenDota: already parsed, request-and-poll, timeout, unavailable replay, rate limit.
3. STRATZ: обязательный exact User-Agent, Bearer token, GraphQL/HTML/HTTP errors, отсутствие token.
4. Нормализация: поиск account, provenance, конфликт значений, четыре фазы, extrema, data gates.
5. Report: aggregate-only не превращает корреляцию в причину и перечисляет недостающие данные.
6. Интеграционный offline-тест полного orchestration с mock fetch.
7. Живой запуск на `8963363814` / `56386500` без сохранения сырых API-ответов.

Критерий готовности: все offline-тесты проходят; живой запуск создаёт валидные JSON/Markdown, находит нужного игрока, сообщает статусы обоих источников и не раскрывает token.

## Изменения в skill bundle

- `SKILL.md` получает обязательный вызов runtime перед разбором по match ID и ссылку на CLI reference.
- `references/source-policy.md` получает точный runtime contract и правила degraded mode.
- новый `references/runtime.md` документирует команды, output schema и troubleshooting.
- generated `output/` остаётся локальным рабочим артефактом и не является частью инструкций скилла.

# Runtime для анализа матча

Этот runtime собирает воспроизводимый **инвентарь доказательств** по матчу до написания тренерского разбора. Требуются Node.js 18+ и сетевой доступ; `npm install` и сторонние пакеты не нужны.

## Подготовка STRATZ

`STRATZ_API_KEY` открывает дополнительный источник STRATZ. Не вставляйте токен в чат, Markdown, командную историю, артефакты или репозиторий. Устанавливайте его только в текущую сессию либо через менеджер секретов/CI.

Windows PowerShell (ввод скрыт):

```powershell
$secureToken = Read-Host -AsSecureString 'STRATZ_API_KEY'
$env:STRATZ_API_KEY = [System.Net.NetworkCredential]::new('', $secureToken).Password
Remove-Variable secureToken
```

macOS/Linux Bash (ввод скрыт; запускайте этот setup-фрагмент в Bash):

```sh
read -r -s -p 'STRATZ_API_KEY: ' runtime_token; printf '\n'
export STRATZ_API_KEY="$runtime_token"
unset runtime_token
```

Сам `scripts/analyze-match.sh` остаётся переносимым wrapper для `/bin/sh`; Bash требуется только для приведённого выше скрытого ввода токена.

Без переменной runtime не делает запрос к STRATZ и записывает `sources.stratz.status: "unavailable"` с причиной `"missing_token"`. Это не делает доступные данные OpenDota недействительными. Финальный ответ должен предложить подключить STRATZ для position/lane/playback enrichment, назвать конкретно недоступные данные и продолжить разрешённый OpenDota-разбор в degraded mode. Токен не следует просить вставить в чат.

Runtime собирает peer baseline вторым запросом к STRATZ `heroStats.stats`. Leaderboard сильных игроков и self-baseline по-прежнему не собираются, поэтому токен сам по себе `baseline_ready` не гарантирует.

## Запуск

Нужен положительный целый `match_id` и селектор игрока: положительный целый `account_id` либо точное английское имя героя. Запускайте из корня skill bundle. Если указаны оба селектора, они должны соответствовать одному игроку.

Windows PowerShell wrapper:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500 --parse-timeout-ms 120000 --output-dir .\output
```

Windows, чужой матч по герою:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8963363814 -Hero 'Earth Spirit' --parse-timeout-ms 120000 --output-dir .\output
```

macOS/Linux POSIX wrapper:

```sh
./scripts/analyze-match.sh 8963363814 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

macOS/Linux, чужой матч по герою:

```sh
./scripts/analyze-match.sh 8963363814 'Earth Spirit' --parse-timeout-ms 120000 --output-dir ./output
```

Прямой вызов Node (любая платформа с Node.js 18+):

```sh
node scripts/analyze-match.mjs --match-id 8963363814 --account-id 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

Вместо `--account-id` можно передать `--hero 'Earth Spirit'`.

Аргументы:

| Аргумент | Обязателен | По умолчанию | Значение |
| --- | --- | --- | --- |
| `--match-id` / `-MatchId` / первый аргумент shell wrapper | да | — | ID матча Dota 2 |
| `--account-id` / `-AccountId` / числовой второй аргумент shell wrapper | один из двух | — | Steam account ID анализируемого игрока |
| `--hero` / `-Hero` / текстовый второй аргумент shell wrapper | один из двух | — | Точное английское имя героя; применяется для чужих матчей без известного account ID |
| `--parse-timeout-ms` | нет | `120000` | общий лимит ожидания parse job OpenDota в миллисекундах |
| `--output-dir` | нет | `<skill-root>/output` | каталог для нормализованных артефактов |

При успехе stdout показывает статусы `opendota`, `valve`, `stratz`, затем пути `json` и `markdown`. При каталоге по умолчанию это `output/<match_id>.json` и `output/<match_id>.md`.

## Артефакты и их смысл

JSON — нормализованная evidence model, а Markdown — её детерминированное, удобное для чтения представление. Верхний уровень JSON:

```text
schemaVersion, generatedAt, request, sources, match, player, draft, lane,
summary, items, events, series, patch, phases, baseline, eventInventory,
dataQuality, warnings
```

`draft.radiant` и `draft.dire` хранят стороны отдельно; `draft_ready` открывается только при пяти различных героях с каждой стороны. `events` содержит компактный allowlisted таймлайн выбранного игрока из STRATZ и валидированные `teamfights` OpenDota с `source` у каждой записи. Булевый `eventInventory` сам по себе не открывает `event_ready`: в записываемом артефакте должны остаться пригодные события с таймкодами. `summary`, `items`, `series` и `phases` содержат итоговые метрики, финальный инвентарь/покупки, исходные ряды и фазовые дельты/экстремумы. Материальные расхождения источников сохраняются как `candidates` с provenance и предупреждением.

`player.rank` хранит сырой двузначный код STRATZ и его человекочитаемый `label`: десятки — медаль (`Herald`…`Immortal`), единицы — звезда. `60` → `Ancient`, `42` → `Archon 2`, `80` → `Immortal`. Неизвестный код оставляет `label: null` и в Markdown печатается как `лейбл неизвестен`; выдумывать медаль по незнакомому коду нельзя. Это средний bracket матча, а не подтверждённый ранг конкретного игрока, и он не является baseline.

### Baseline

`baseline` — нормативная выборка того же героя, позиции и bracket на текущем патче. Она собирается вторым запросом к STRATZ `heroStats.stats` уже после нормализации, потому что селекторы известны только оттуда. Отказ baseline никогда не отменяет остальные факты матча.

`baseline.sameHeroPositionRankPatch` описывает выборку: `heroId`, `position`, `bracket` с человекочитаемым `bracketLabel`, `patch`, список `weeks` и `points` — кумулятивные средние на выбранных минутах с собственным `matchCount` у каждой. `baseline.comparisons` содержит готовые строки сравнения: `metric`, `minute`, `player`, `baseline`, `delta`, `ratio`, `matchCount` и `crossSourceProxy`.

Ограничения, которые нужно называть в ответе:

- `statistic` всегда `mean`. Источник не отдаёт перцентили, поэтому «ты в нижних 30%» сказать нельзя — только отношение к среднему.
- Bracket грубый, четыре корзины: `HERALD_GUARDIAN`, `CRUSADER_ARCHON`, `LEGEND_ANCIENT`, `DIVINE_IMMORTAL`.
- Патч фильтруется неделями. Берутся только недели, целиком лежащие внутри текущего патча, максимум шесть последних; неделя, пересекающая границу патча, отбрасывается целиком.
- Минута попадает в выборку только при `matchCount` не меньше 200, а `matchCount` естественно падает к поздним минутам: сравнение на 50-й минуте обусловлено тем, что матч до неё дожил.
- Сравнения net worth здесь нет. OpenDota `gold_t` — накопленное золото, а не net worth: в матче 8963443105 последняя точка ряда равна 12 772 при `net_worth` 11 150, и прокси систематически завышал игрока против baseline `networth`. Сопоставимого минутного ряда net worth не отдаёт ни один источник runtime, поэтому строка убрана. Флаг `crossSourceProxy` остаётся в схеме для будущих рядов и сейчас не выставлен ни одной строкой; итоговый `summary.netWorth` берётся из `net_worth`, а не из `total_gold`.

Возможные `baseline.reason` при закрытом гейте: `not_requested`, `missing_token`, `hero_unknown`, `position_unknown`, `rank_unknown`, `no_full_week_in_current_patch`, `empty_sample`, `no_comparable_point`. При `status: "failed"` причина заменяется безопасным `error.code`.

`match.gameMode` и `match.lobbyType` приходят разными словарями: OpenDota отдаёт числа Valve, STRATZ — строки своих enum. Runtime сводит их к числовому id Valve и печатает человекочитаемый `label` (`22` и `ALL_PICK_RANKED` — один режим `All Draft`, `0` и `UNRANKED` — один тип лобби). Таблицы покрывают game mode 0–24 и lobby type 0–9, где словари совпадают. Значение вне таблицы не объявляется конфликтом источников: поле остаётся `null` с `candidates`, а предупреждение звучит как `outside the known vocabulary`. Настоящее расхождение режимов по-прежнему даёт предупреждение `conflict`.

`sources` содержит `opendota`, `stratz` и `valve`. Каждый источник имеет `status` (`ready`, `unavailable`, `failed` или `not_found`) и, если применимо, безопасные `reason`, `error.code` и `parse` (`requested`, `state`). Для OpenDota parse state может быть `not_requested`, `requested`, `completed`, `timeout`, `unavailable`, `failed` или `error`.

Перед интерпретацией обязательно прочитайте и зафиксируйте `sources` и `dataQuality.gates`. Гейты имеют точные имена:

| Gate | Разрешает |
| --- | --- |
| `scoreboard` | факты результата/паспорта |
| `phase_aggregates` | сравнение наблюдаемых фаз внутри матча |
| `draft_ready` | полный пик и контекст пика |
| `event_ready` | таймлайн событий и анализ конкретного эпизода |
| `baseline_ready` | нормативное сравнение с выборкой hero + position + bracket на текущем патче |
| `current_patch` | анализ в области поддерживаемого точного текущего подпатча |

`dataQuality.mode: "degraded"`, `missing` или закрытый gate ограничивают выводы по [review template](review-template.md); не заполняйте закрытые слоты догадками.

Evidence Markdown — это **не** финальный тренерский ответ. Он перечисляет факты, статусы, метрики, гейты и недостающие данные. Финальный ответ пишется отдельно по `SKILL.md` и [review template](review-template.md): только после проверки артефакта, только с выводами, разрешёнными гейтами, и с явной уверенностью/альтернативами, где это требуется.

## Ошибки и безопасное восстановление

| Наблюдение | Значение | Безопасное действие |
| --- | --- | --- |
| `parse.state: "timeout"` или `error.code: "parse_timeout"` | OpenDota не завершил parse до лимита | Сохраните degraded status; позже запустите тот же запрос повторно или увеличьте `--parse-timeout-ms`. Не выдумывайте replay-derived события. |
| `parse.state: "unavailable"`/неуспешный parse | Parse job не выдана или завершилась без нужных рядов | Используйте только фактически открытые гейты; не подменяйте отсутствие событий нулями. |
| `sources.stratz` = `unavailable/missing_token` | Токен не задан | Анализируйте доступный OpenDota evidence в degraded mode; не утверждайте STRATZ enrichment. |
| `error.code: "auth"` (HTTP 401/403) | Токен отсутствует, неверен или не имеет доступа | Проверьте secret manager/переменную в текущей сессии и права токена; не печатайте его для диагностики. |
| `error.code: "invalid_response"` и HTML/Cloudflare | API вернул не JSON, часто challenge/proxy-страницу | Не парсите HTML и не обходите challenge; повторите позднее из разрешённой сети или используйте доступные источники. |
| `error.code: "rate_limited"` (HTTP 429) | Временный лимит источника | Подождите и запустите запрос позднее. Не делайте агрессивный параллельный retry. |
| `error.code: "network"`, `"timeout"` или `"http"` | Временная сеть/серверная ошибка | Сохраните статус источника, повторите позже и оставьте соответствующие гейты закрытыми. STRATZ периодически отдаёт `503` на тяжёлый match-запрос при неисчерпанной квоте, поэтому один такой отказ — не признак неверного токена. |
| `error: patch_unverified` | Valve timeline недоступен или точный патч не подтверждён | Runtime завершился с кодом `4` и не записал success-артефакт; повторите после восстановления timeline. |
| `error: unsupported_patch` | Матч относится не к последнему точному подпатчу | Runtime завершился с кодом `4` и не записал success-артефакт; этот матч вне области первой версии. |

Exit codes процесса:

| Код | Значение |
| --- | --- |
| `0` | Нормализованный evidence-артефакт записан |
| `2` | Некорректные аргументы, игрок не найден или неоднозначен |
| `3` | Матч не найден |
| `4` | Иная runtime/data error, включая отсутствие пригодного источника, неподтверждённый или старый точный патч |

В артефакты намеренно попадают только нормализованные JSON и Markdown. Runtime не сохраняет raw API responses, HTTP-заголовки или токены; не добавляйте такие данные вручную при отладке.

Безопасные ошибки селектора игрока: `hero_not_found`, `hero_ambiguous`, `hero_account_unavailable`, `hero_lookup_unavailable` и `selector_conflict`; все возвращают exit code `2` без вывода сырых ответов.

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

Без переменной runtime не делает запрос к STRATZ и записывает `sources.stratz.status: "unavailable"` с причиной `"missing_token"`. Это не делает доступные данные OpenDota недействительными, но не разрешает заявлять роли, playback, baseline или другое STRATZ-обогащение как доступное.

## Запуск

Нужны положительные целые `match_id` и `account_id`. Запускайте из корня skill bundle.

Windows PowerShell wrapper:

```powershell
.\scripts\analyze-match.ps1 -MatchId 8963363814 -AccountId 56386500 --parse-timeout-ms 120000 --output-dir .\output
```

macOS/Linux POSIX wrapper:

```sh
./scripts/analyze-match.sh 8963363814 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

Прямой вызов Node (любая платформа с Node.js 18+):

```sh
node scripts/analyze-match.mjs --match-id 8963363814 --account-id 56386500 --parse-timeout-ms 120000 --output-dir ./output
```

Аргументы:

| Аргумент | Обязателен | По умолчанию | Значение |
| --- | --- | --- | --- |
| `--match-id` / `-MatchId` / первый аргумент shell wrapper | да | — | ID матча Dota 2 |
| `--account-id` / `-AccountId` / второй аргумент shell wrapper | да | — | Steam account ID анализируемого игрока |
| `--parse-timeout-ms` | нет | `120000` | общий лимит ожидания parse job OpenDota в миллисекундах |
| `--output-dir` | нет | `<skill-root>/output` | каталог для нормализованных артефактов |

При успехе stdout показывает статусы `opendota`, `valve`, `stratz`, затем пути `json` и `markdown`. При каталоге по умолчанию это `output/<match_id>.json` и `output/<match_id>.md`.

## Артефакты и их смысл

JSON — нормализованная evidence model, а Markdown — её детерминированное, удобное для чтения представление. Верхний уровень JSON:

```text
schemaVersion, generatedAt, request, sources, match, player, draft, lane,
summary, items, events, series, patch, phases, eventInventory, dataQuality,
warnings
```

`draft.radiant` и `draft.dire` хранят стороны отдельно; `draft_ready` открывается только при пяти различных героях с каждой стороны. `events` содержит компактный allowlisted таймлайн выбранного игрока из STRATZ и валидированные `teamfights` OpenDota с `source` у каждой записи. Булевый `eventInventory` сам по себе не открывает `event_ready`: в записываемом артефакте должны остаться пригодные события с таймкодами. `summary`, `items`, `series` и `phases` содержат итоговые метрики, финальный инвентарь/покупки, исходные ряды и фазовые дельты/экстремумы. Материальные расхождения источников сохраняются как `candidates` с provenance и предупреждением.

`sources` содержит `opendota`, `stratz` и `valve`. Каждый источник имеет `status` (`ready`, `unavailable`, `failed` или `not_found`) и, если применимо, безопасные `reason`, `error.code` и `parse` (`requested`, `state`). Для OpenDota parse state может быть `not_requested`, `requested`, `completed`, `timeout`, `unavailable`, `failed` или `error`.

Перед интерпретацией обязательно прочитайте и зафиксируйте `sources` и `dataQuality.gates`. Гейты имеют точные имена:

| Gate | Разрешает |
| --- | --- |
| `scoreboard` | факты результата/паспорта |
| `phase_aggregates` | сравнение наблюдаемых фаз внутри матча |
| `draft_ready` | полный пик и контекст пика |
| `event_ready` | таймлайн событий и анализ конкретного эпизода |
| `baseline_ready` | нормативное сравнение по роли/rank/patch |
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
| `error.code: "network"`, `"timeout"` или `"http"` | Временная сеть/серверная ошибка | Сохраните статус источника, повторите позже и оставьте соответствующие гейты закрытыми. |
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

# Политика источников

## Быстрый маршрут

| Задача | Основной источник | Проверка/ограничение |
|---|---|---|
| Факты матча и parse job | OpenDota API | Базовый scoreboard не означает, что replay распарсен |
| Позиция 1–5, lane outcome, playback, role/rank baseline | STRATZ GraphQL | Токен; точный `User-Agent: STRATZ_API` |
| Точный текущий подпатч и числа | Valve patch timeline, patch notes и Datafeed | Datafeed не документирован и требует schema validation |
| Объяснение механик | Liquipedia | Текущие числа сверять с Valve |
| Сильные игроки и билды | STRATZ hero leaderboard и свежие матчи | Фильтровать по `IMMORTAL`, той же позиции и текущему патчу |
| Дополнительная проверка игрока | OpenDota hero ranking и player matches | Hero ranking не разделён по позиции |

Не использовать Dota2ProTracker, старый Dota 2 Fandom и `GetMatchDetails` как runtime-источники.

## Parse-first

1. Загрузить `GET https://api.opendota.com/api/matches/{match_id}`.
2. Проверить не только `players`, но и `version`, replay URL и нужные replay-derived массивы: `gold_t`, `xp_t`, `lh_t`, покупки, события и teamfights.
3. Если их нет, отправить `POST https://api.opendota.com/api/request/{match_id}`.
4. Дождаться terminal state job и повторно загрузить матч.
5. Если replay недоступен, сохранить уже полученный базовый scoreboard как пригодный OpenDota evidence, записать parse state/error отдельно, включить degraded mode и перечислить недоступные выводы.

STRATZ может вернуть только базовые данные, если его replay ещё не распарсен. Не считать отсутствие playback нулевым количеством действий.

## Точный патч

OpenDota patch ID может обозначать только семейство вроде `7.41`. Определи буквенный подпатч по `start_time` и последней записи Valve patch timeline, опубликованной не позже начала матча. Первая версия поддерживает только последний текущий подпатч: старый точный патч возвращает `unsupported_patch`, недоступный/непроверенный timeline — `patch_unverified`; оба пути завершаются ненулевым кодом без success-артефакта.

## STRATZ

Запросы идут на `https://api.stratz.com/graphql` с:

```text
Authorization: Bearer <STRATZ_API_KEY>
User-Agent: STRATZ_API
Content-Type: application/json
```

Не выводи и не сохраняй токен. Полезные группы данных:

- `match.players`: hero, position, lane, role, IMP;
- lane outcomes и поминутные stats;
- `playbackData`: mana/health, ability uses, position, successful CS, items and runes;
- `heroStats.stats`: текущие агрегаты по hero, position и bracket;
- `leaderboard.hero`: сильные игроки по герою с фактической позицией.

IMP — закрытая модельная метрика и дополнительный сигнал. Она не доказывает конкретную ошибку. Не называй `predictedOutcomeWeight` или другое недокументированное поле процентом перевеса пика.

## Контекст пика

Оцени три независимых сигнала:

1. `lane_expectation`: matchup того же патча, позиции и близкого bracket;
2. `team_fit`: наличие у пика необходимых функций и взаимодействий;
3. `draft_prior`: только понятный и проверенный модельный сигнал.

Показывай `favorable`, `even`, `unfavorable` или `insufficient_data`, причины, размер выборки и уверенность. Не смешивай ожидаемый матчап с фактическим lane outcome.

## Baseline

Порядок сравнения:

1. тот же игрок на том же герое и позиции;
2. тот же hero + position + bracket + patch + mode;
3. сильные игроки STRATZ на том же hero + position + patch;
4. более широкие OpenDota benchmarks как слабый ориентир.

Не копируй pro-build механически. Сравнивай старт, порядок компонентов, тайминги и адаптацию к десяти героям.

## Доступные микросигналы

Обычный режим может анализировать подтверждённые mana windows, применения способностей, успешные добивания способностью, позиции, предметы и руны. Success-only события не показывают всех упущенных возможностей. Без сырого `.dem` не утверждай, почему был пропущен конкретный крип или нажат/не нажат конкретный input.

## Иерархия доверия

1. Текущие числа и изменения: Valve.
2. Факты эпизода: распарсенный replay, затем OpenDota/STRATZ.
3. Механики: Liquipedia с cross-check.
4. Ожидания: релевантная статистическая выборка.
5. Стратегия: маркированная тренерская интерпретация.

При конфликте назови расхождение и снизь уверенность.

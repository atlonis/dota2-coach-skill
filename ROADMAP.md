# Roadmap: Dota 2 Match Coach

Документ для разработки репозитория, а не часть устанавливаемого скилла: агент во время разбора его не читает. Roadmap перечисляет функции, которые уже предусмотрены data gates, но ещё не автоматизированы в runtime. Каждый этап должен сохранять provenance, exact-patch filtering и запрет на выводы при закрытом gate.

То, что реализовано сейчас, описано в [SKILL.md](dota2-match-coach/SKILL.md) и [политике источников](dota2-match-coach/references/source-policy.md); описание этапа ниже не является заявкой на возможность.

## 1. Статистическая модель пика

Цель — давать проверяемый `draft_prior`, а не субъективный процент перевеса.

- собрать matchup и synergy-выборки текущего точного патча с фильтрами по позиции, bracket и mode;
- отделить `lane_expectation` от общего преимущества десяти героев;
- формализовать `team_fit` capability vector: initiation, control, save, frontline, damage profile, tower/objective pressure, wave clear, scaling и fight continuation;
- выбрать документированную модель draft advantage, сохранить версию модели, размер выборки и calibration metadata;
- выводить вероятность только при достаточной выборке и измеренной калибровке; иначе `insufficient_data`;
- тестировать симметрию сторон, неизвестных героев, малые выборки и смену точного подпатча.

Definition of done: `draft_prior` имеет provenance, model version, sample size, confidence/calibration и не открывается одним фактом полного пика.

## 2. Role/rank/patch baseline и сильные игроки

Цель — открыть `baseline_ready` и заменить внутриматчевые extrema релевантным нормативным сравнением.

Peer baseline реализован: runtime записывает `model.baseline.sameHeroPositionRankPatch` из STRATZ `heroStats.stats` и открывает `baseline_ready` только при выборке, прошедшей порог размера. Остаётся:

- self-baseline: тот же игрок, герой, позиция, patch и mode;
- strong-player baseline: свежие матчи STRATZ leaderboard на том же hero + position + exact patch;
- отдельные распределения по lane matchup, item components и power-spike timing;
- percentile вместо отношения к среднему: текущий источник отдаёт только средние, поэтому нужен другой сбор;
- точный патч вместо приближения неделями и фильтр по mode;
- сравнение net worth по минутам: прокси из OpenDota `gold_t` убран как завышающий, а сопоставимого минутного ряда net worth не отдаёт ни OpenDota, ни STRATZ `playbackData`;
- автоматический fallback к более широкой выборке только с маркировкой слабого ориентира.

Definition of done для остатка: каждое сравнение несёт percentile и confidence, а не только отношение к среднему и размер выборки.

## 3. Сырой `.dem` и глубокие микромеханики

Цель — анализировать не только успешные события API, но и доступные игроку возможности и последовательность inputs.

- безопасное получение replay и проверка patch/parser compatibility;
- parser для orders, cast attempts, cooldowns, mana/health windows, vision, creep aggro и unit state;
- реконструкция конкретной волны: здоровье крипов, attack projectiles, deny/last-hit window и доступные способности;
- выявление полной маны при доступном полезном spell window без автоматического объявления ошибки;
- анализ missed opportunity через состояние мира, а не через отсутствие success-event;
- эпизодические доказательства с таймкодом, состоянием до input, действием, результатом и альтернативой;
- отдельные confidence rules для неполных или повреждённых replay.

Definition of done: скилл может объяснить конкретную микромеханику на линии по `.dem`, воспроизвести доказательство и отличить подтверждённую ошибку от гипотезы.

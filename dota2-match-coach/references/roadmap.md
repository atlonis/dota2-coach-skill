# Roadmap: Dota 2 Match Coach

Roadmap перечисляет функции, которые уже предусмотрены data gates, но ещё не автоматизированы в runtime. Каждый этап должен сохранять provenance, exact-patch filtering и запрет на выводы при закрытом gate.

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

- self-baseline: тот же игрок, герой, позиция, patch и mode;
- peer baseline: hero + position + bracket + exact patch + mode;
- strong-player baseline: свежие матчи STRATZ leaderboard на том же hero + position + exact patch;
- отдельные распределения по стадиям, lane matchup, item components и power-spike timing;
- sample-size, percentile и confidence для каждого сравнения;
- запрет смешивания core/support выборок и автоматический fallback к более широкой выборке только с маркировкой слабого ориентира.

Definition of done: runtime записывает `model.baseline.sameHeroPositionRankPatch`, открывает `baseline_ready` только после schema validation и позволяет задавать измеримые performance targets.

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

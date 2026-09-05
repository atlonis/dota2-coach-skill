# Review contract

The final review normally has **500–780 words** and never exceeds **900**. Its primary content is the first five blocks. Headings are closed: use exactly the first five below, in order; `## Стадии` and `## Ограничения данных` are optional, and `## Драфт, задача и предметы` is mandatory in a full review. Do not add any heading or section. Omit generic role, draft, item, ability, or context advice; put brief, supported match-specific evidence only in the allowed blocks.

```markdown
## Матч
## Главный вывод
## Смерти
## Переломный момент
## Упражнение
## Стадии
## Драфт, задача и предметы
## Ограничения данных
```

The listed Russian headings are canonical Russian renderings. Write in the language the user explicitly requested; otherwise use their last substantive-message language. For a non-Russian response, use faithful semantic localized equivalents of these headings in the exact same order and with the same mandatory, optional, and safety constraints. Preserve artifact spelling for hero, item, ability, and source names. Player-facing prose never shows schema, capability, gate, error-code, internal-ID, or field names. If a name is unresolved, use a localized neutral equivalent of “unknown entity,” never an ID or a guess.

## Матч

One line: hero, role/position when known, result, duration, and K/D/A. Hero-only selection uses “игрок на <Hero>”, never “ты”.

## Главный вывод

Choose one evidenced priority: repeated confirmed death pattern; otherwise largest relevant ready-peer deviation; otherwise confirmed efficiency event. State the actual rank cohort and selection method, plus any mismatch; a mismatched/fallback/conflicting reference is not same-rank.

## Смерти

Account for every death with compact timecoded facts. First group deaths with the same non-empty confirmed signature into one compact row and list every grouped death timecode. Keep each unique death as its own compact row. State a shared feature only when every named context confirms it. Count rows after grouping: if more than five would render, show five most informative rows plus one final row that lists every remaining death timecode and contains no interpretation. The priority death is always among the five informative rows; then prefer confirmed repeated-signature rows, then the rows with the most known timestamped facts, breaking a tie by later death time. For the priority death, separate facts, the allowed hypothesis, and unavailable evidence. Preserve the event timestamps: a TP use, reposition, nearby-unit observation, item use, and death are distinct facts; nearby units at one recorded time are not facts about arrival or teleport choice.

For a signature-only priority death in Russian, paste exactly this canonical two-sentence form and add no second hypothesis or behavioural, item-effect, destination, timing, or counterfactual inference:

**«Поддерживаемая гипотеза (средняя уверенность): повторённая подтверждённая сигнатура — риск-паттерн этой игры и приоритет для проверки. Она не объясняет причину смерти.»**

In another response language, translate the meaning of the canonical form faithfully without adding a clause or another hypothesis.

## Переломный момент

Name one confirmed episode or state that no such episode is established. Do not infer intent, vision, enemy cooldowns, readiness, or guaranteed survival.

## Упражнение

Paste exactly one paragraph before drafting; add no lead-in, follow-up, checklist, second goal, or other sentence. The Russian templates below are canonical; in another response language, use a faithful semantic localization of the chosen one-paragraph form without adding content.

- Use this ready-reference template only when rank cohort/selection method agrees with player rank and is neither fallback nor conflict: `После матча сверить [показатель] игрока к [отметка матча] со средним [среднее выборки] по [число матчей] на основе [основа ранговой выборки] и записать значение игрока, среднее выборки и соответствие ранга. Критерий выполнения — записаны значение игрока, среднее выборки, отметка матча, число матчей и основа ранговой выборки/соответствие ранга.` Every token enclosed in `[` and `]` is an authoring placeholder: replace it with a localized player-facing label and the actual sourced value; never leave the delimiters or placeholder text in the review. Every quantity comes from that exact source row.
- If the source row is mismatched, fallback, conflicting, or unsuitable, use only this no-reference template: `После каждого релевантного эпизода сделать запись: подтверждённые факты, недоступные данные и повторившаяся сигнатура; после матча сравнить записи. Критерий выполнения — в каждой рассмотренной записи всё необходимое указано либо явно помечено как недоступное.`

The no-reference paragraph has no numerals, spelled-out counts, durations, percentages, game counts, checklist, or other quantity. In particular, a DIVINE reference for a Legend player uses this form.

## Стадии

Optional. It is the only place any stage interval may appear. Use one table and at most two unique interval rows; do not name or summarize a stage/range anywhere else. Label each figure as an interval aggregate or cumulative value at a stated match-time marker. Stage membership is half-open `[start,end)`: an event exactly at 15:00 belongs to the interval starting at 15:00, not the interval ending then. The final match endpoint may be included in the final interval.

## Драфт, задача и предметы

Required in a full review and placed after optional `## Стадии`. Cover each category in one compact passage:

- **Draft:** when verified draft evidence and resolved named entities are available, state only the relevant fact and confidence; otherwise state that draft evidence is unavailable.
- **Match-specific hero task:** when sourced match-specific task context and resolved named entities are available, state the task fact and confidence; otherwise state that the match-specific hero task is unavailable.
- **Item decisions:** when recorded item-decision evidence and resolved named entities are available, state the item fact and confidence; otherwise state that item-decision evidence is unavailable.

Do not turn an unavailable category into generic role, hero, ability, or item advice. Keep names unaltered from the artifact and keep an unresolved name as localized “unknown entity.”

## Ограничения данных

Optional. State only data limits, source conflicts, unknowns, or rank-cohort/selection-method mismatch that change a conclusion.

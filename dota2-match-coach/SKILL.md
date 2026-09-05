---
name: dota2-match-coach
description: Use when a user asks for a current-patch Dota 2 post-match review by match ID and identifies a player by account ID or hero, including draft, role, lane matchup, item build, stage efficiency, macro, or supported micro-mechanics.
---

# Dota 2 Match Coach

Produce an evidence-backed review only for the current exact Dota 2 sub-patch, with a match ID and an account ID or unambiguous English hero name. **Поддержка старых патчей не реализуется и не входит в будущий roadmap этого навыка.**

Read [runtime](references/runtime.md), run its wrapper, then interpret the normalized JSON and evidence Markdown under [source policy](references/source-policy.md). Inspect sources, warnings, nulls, and `dataQuality.capabilities` before writing. Capabilities permit conclusions but do not prevent a narrower factual review. Use the closed [review template](references/review-template.md) for the player-facing response.

Analyse every selected-player death. With hero-only selection, use neutral “the player on <Hero>”; use second person only after explicit match-ownership confirmation. Read [death policy](references/death-analysis.md) and [decision stack](references/decision-stack.md). Keep unknowns and conflicts visible. Never claim intent, vision, cooldowns, ability readiness, or guaranteed survival.

Use the language explicitly requested by the user; if none was requested, use the language of their last substantive message. Keep hero, item, ability, and source names in their artifact spelling rather than translating them. These are presentation rules for the player-facing review: do not expose schema versions, capability or gate names, error-code names, internal IDs, or field names. If an entity has no resolved name, use a localized neutral equivalent of “unknown entity”; do not guess its name. The Russian headings and closed forms below are canonical Russian renderings. In another response language, use their faithful semantic localized equivalents in the same order and with the same mandatory, optional, and safety constraints.

## Closed review skeleton

The final review uses these headings only, in this order. The first five are mandatory and first; `## Стадии` and `## Ограничения данных` are optional, while `## Драфт, задача и предметы` is mandatory in a full review. No other heading or section is allowed. Omit generic role, draft, item, ability, and context advice; place brief match-specific evidence only inside the allowed blocks.

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

Write normally **500–780 words**, hard maximum 900. The five mandatory blocks carry the review.

`## Драфт, задача и предметы` comes after optional `## Стадии` and before optional `## Ограничения данных`. In one compact passage, cover all three categories: the verified draft, the match-specific task for the selected hero, and recorded item decisions. When each category has the required supported context and resolved entity names, state brief facts with confidence. When any category lacks that support, explicitly state that draft, task, or item decisions respectively are unavailable. Never replace an unavailable category with generic role advice.

## Closed forms to paste

For a signature-only priority death in Russian, paste exactly this canonical two-sentence form under `## Смерти` and add no second hypothesis or other causal, behavioural, item-effect, destination, timing, or counterfactual inference:

**«Поддерживаемая гипотеза (средняя уверенность): повторённая подтверждённая сигнатура — риск-паттерн этой игры и приоритет для проверки. Она не объясняет причину смерти.»**

In another response language, translate the meaning of that canonical form faithfully without adding a clause or another hypothesis.

`## Упражнение` contains exactly one paragraph, chosen and pasted before drafting. No lead-in, follow-up, checklist, second goal, or other sentence is allowed. The Russian templates are canonical; in another response language, use a faithful semantic localization of the chosen single paragraph with the same constraints.

- Use this **ready-baseline** paragraph only when the reference’s rank cohort and selection method agree with the player rank and are neither fallback nor conflict: `После матча сверить [показатель] игрока к [отметка матча] со средним [среднее выборки] по [число матчей] на основе [основа ранговой выборки] и записать значение игрока, среднее выборки и соответствие ранга. Критерий выполнения — записаны значение игрока, среднее выборки, отметка матча, число матчей и основа ранговой выборки/соответствие ранга.` Every token enclosed in `[` and `]` is an authoring placeholder: replace it with a localized player-facing label and its actual sourced value; never leave the delimiters or placeholder text in the review. Every quantity comes from that exact ready row.
- Otherwise paste this **no-baseline** paragraph: `После каждого релевантного эпизода сделать запись: подтверждённые факты, недоступные данные и повторившаяся сигнатура; после матча сравнить записи. Критерий выполнения — в каждой рассмотренной записи всё необходимое указано либо явно помечено как недоступное.`

The no-baseline form contains no quantity of any kind. A mismatched, fallback, or conflicting reference—including DIVINE versus Legend—must use it.

## Mandatory final audit

Before sending, fix every failure:

- The heading list is exactly the allowed skeleton; the first five are first and ordered; a full review includes `## Драфт, задача и предметы` after optional `## Стадии` and before optional `## Ограничения данных`.
- `## Упражнение` is exactly one allowed paragraph. A mismatched/fallback/conflicting reference uses the no-baseline paragraph. Each authoring token enclosed in `[` and `]` is replaced by a localized player-facing label and actual sourced value; no delimiter or placeholder reaches the review.
- A signature-only priority death contains the exact Russian safe hypothesis in Russian, or its faithful no-added-clause semantic translation in another response language, and no second hypothesis. Every factual timecode is copied directly from its artifact field and agrees with repeated mentions; nearby-unit claims retain their recorded timestamp.
- `## Стадии`, if present, is the only place stage intervals appear, has at most two unique rows, and labels every figure interval or cumulative. Assign events by half-open intervals `[start,end)`: an event at 15:00 belongs to the interval starting at 15:00, not one ending then; the final match endpoint may belong to the final interval.
- Death rows are compacted by identical confirmed signatures while retaining every timecode; no more than five informative rows plus one uninterpreted remaining-timecodes row are rendered. The priority death is one of the informative rows and separates facts, the exact safe hypothesis when signature-only, and unavailable evidence.
- The requested language (or last substantive-message language) is used. The Russian headings/forms are semantically localized in another response language without changing their order or constraints; entity/source names are unmodified, and no schema, capability, gate, error-code, internal-ID, or field name reaches coaching prose. A missing entity name is a localized neutral “unknown entity.”
- Word count is at most 900. Remove unsupported generic role/draft/item/ability claims, and keep source conflicts, rank-cohort/selection-method mismatch, and nulls explicit when they matter.

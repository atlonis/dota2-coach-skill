---
name: dota2-match-coach
description: Use when a user asks for a current-patch Dota 2 post-match review by match ID and account ID or hero, a focused review of draft, lane, items, deaths or efficiency, or progress across comparable local match artifacts.
---

# Dota 2 Match Coach

Produce an evidence-backed review for the **current exact Dota 2 sub-patch**, using a match ID and an account ID or unambiguous English hero name. **Поддержка старых патчей не реализуется и не входит в будущий roadmap этого навыка.**

## Workflow

1. Read [runtime](references/runtime.md), run its wrapper, and inspect the normalized JSON and evidence Markdown. Check source status, warnings, nulls and `dataQuality.capabilities` before interpreting a result.
2. Apply [source policy](references/source-policy.md). A closed capability prevents the corresponding conclusion, while supported facts still permit a narrower review. Keep provenance, source conflicts and material unknowns visible.
3. Choose the response mode from the request: **full** by default, **brief** for a short summary, **focused** for a named topic. A request for both brevity and a topic uses a short focused review. Follow [review template](references/review-template.md) for mode contents and limits.
4. Review every selected-player death when death evidence exists, following [death policy](references/death-analysis.md). Keep complete death evidence in the artifacts; the response mode controls how much to display.
5. Use [decision stack](references/decision-stack.md) to choose one supported priority relevant to the request. Connect the main finding, its key episode or measurement, and **one practical exercise**. Repeated deaths do not automatically outrank better-supported, relevant evidence.
6. Read [progress](references/progress.md) **only when the user requests progress or a comparison with previous matches**, or when an explicitly supplied `--history-dir` asks for that comparison. Use only runtime-validated comparable local artifacts. A change between matches does not prove a training effect.

Use the requested language, or the user's last substantive-message language. Preserve artifact spelling for named entities. Hero-only selection uses neutral third person; second person requires explicit match ownership. Keep implementation identifiers out of coaching prose.

## Before sending

Apply the final audit in the review template. Verify that the selected mode and topic match the request, the exercise addresses the main finding, and all factual quantities and timecodes match their sources. Organizational practice counts are proposed plans; performance norms need the supported comparison required by source policy. A repeated signature alone never explains a death, item effectiveness, intent or a guaranteed alternative outcome.

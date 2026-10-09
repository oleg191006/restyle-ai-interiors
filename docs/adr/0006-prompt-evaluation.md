# ADR 0006: Choosing the redesign prompt by evaluation

- Status: accepted
- Date: 2026-10-09

## Context

The first prompts were judged on one photo. In production, "Eclectic" kept the old wallpaper
and wall unit, so a prompt that looked good on one example was not good in general. Prompt
changes need the same discipline as code changes: a fixed test set and a comparison, not a
single screenshot.

## Decision

`apps/web/scripts/eval-prompts.ts` (`pnpm --filter web eval:prompts v1 v2 v3`):

- 3 "before" photos kept in the repo (dated living room, kitchen, bedroom), × 4 styles
  (scandinavian, loft, eclectic, classic) = 12 images per prompt version.
- The same seed for each room × style in every version, so only the prompt differs.
- The same preprocessing as the browser (504 px JPEG) and the same model settings as
  production (FLUX.2 klein 4B, guidance 7).
- Results are cached; one contact sheet per version for side-by-side review.
- Prompts are versioned in `lib/ai/prompt.ts`; `currentPromptVersion` selects production.
  Each finished job stores `promptVersion`, so versions can later be compared on real jobs.

Rubric, 1 point each per image: architecture kept (A), walls changed (W), main old furniture
replaced (F), clutter removed (C), style recognisable (S). Max 60 per version.

## Results

| Version | Change | Score | Invented doors / openings | Rooms barely changed |
| --- | --- | --- | --- | --- |
| v1 | keep architecture, replace finishes and furniture | 36 / 60 | 0 | 3 |
| v2 | "first empty the room, then furnish it", names wallpaper, cabinets, objects | 50 / 60 | 3 | 1 |
| **v3** | v2 + "no new doors, windows, openings or panels" + room-specific item lists | **52 / 60** | **0** | 0 |

v1 mostly recoloured the existing furniture. v2 removed it, but where a wardrobe or wall unit
was removed it sometimes painted a door that did not exist, which breaks the core promise
of keeping the room. v3 fixed that and the kitchen case (scandinavian 1 → 2 → 4) by listing
cabinet fronts, countertops and the tablecloth explicitly.

**Production uses v3.**

## Limits of this evaluation

- One rater (the author's assistant), one seed per pair, 12 images per version. 50 vs 52 is
  within noise; the decision rests on the architecture errors (3 → 0), which matter more
  than the total.
- Remaining weakness: large storage furniture (wall units, wardrobes) is often kept and
  restyled rather than replaced, the trade-off of forbidding new openings.
- Cost: ~160 neurons per image, so a full version costs ~1,900 of the shared 10,000 daily
  neurons. Run evaluations on days without expected traffic.

## Consequences

- Any prompt change goes through the eval and is recorded here with its scores.
- Next steps: more photos (bathroom, hallway, a real photo with poor light), two seeds per
  pair, and a vision model as a second rater to reduce single-rater bias.

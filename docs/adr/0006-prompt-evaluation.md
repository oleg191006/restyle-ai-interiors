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
- Cost: ~110 neurons per image (measured: 20 images = 2,160 on the dashboard), so a full version
  of 16 costs ~1,750 of the shared 10,000 daily
  neurons. Run evaluations on days without expected traffic.

## Follow-up: v4 and v5

Publishing examples (ADR 0007) showed v3 adding a window to a windowless bathroom in 3 of 3
styles; the eval set had no windowless room. The bathroom photo is now part of the eval set
(4 photos × 4 styles = 16 per version). v4 removes the two phrases that likely invite a window
("the same walls, window and door positions" and "natural daylight") and asks for lighting
consistent with the photo.

Scored side by side, v3 and v4 in one sitting (`--rooms` runs a subset to save quota):

| Room | v3 | v4 | Note |
| --- | --- | --- | --- |
| bathroom (no window) | 16 / 20, **4 invented windows** | 17 / 20, 1 small transom window | the fix works |
| living room | 18 | 19 | v4 classic finally removes the wall unit |
| kitchen | 18 | **16** | v4 Scandinavian is almost unchanged: same cabinets, backsplash, tablecloth |
| bedroom | 18 | 18 | |
| **Total** | **70 / 80** | **70 / 80** | |

v3's three-room score is 54 here against 52 in the first evaluation: the same images, scored
again. That is the single-rater noise the limits section warns about, and why architecture
errors decide, not a two-point difference.

v4 fixes invented architecture but introduces "barely changed" results, both in the
Scandinavian style (kitchen and bathroom, whose tiles stay). Likely cause: v4 says "keep the
architecture exactly as it is in the photo: the same walls", which contradicts "remove wall
finishes, tiles, backsplash"; v3 said "wall *positions*". **Production stays on v3.**

v5 tested that idea on the two deciding rooms (bathroom and kitchen, 8 images):

| Room | v3 | v4 | v5 |
| --- | --- | --- | --- |
| bathroom | 4 invented windows | 1 | **3** |
| kitchen | 18 | 16 | 13; the loft kitchen got a different, larger window |

v5 is rejected, and it was a badly designed experiment: it changed three things at once
(dropped "exactly as it is in the photo", "walls" → "wall positions", added "tiles"), so the
result cannot be attributed to any one of them. The likely reading is that "exactly as it is
in the photo" is what holds the windows back: anchoring to the photo trades invented
architecture against unchanged rooms. Two further notes:

- The original kitchen is already light wood on white, close to Scandinavian, so "barely
  changed" there is partly a rubric problem: a faithful Scandinavian kitchen looks like it.
- v6 changes one variable: v4 with "the same walls" → "the same wall positions" and nothing
  else (a unit test enforces that). Next quota day: `eval:prompts v6 --rooms=bathroom,kitchen`
  (~870 neurons), then the other rooms only if it holds.

## Follow-up: v6, one variable

v6 is v4 with one edit, "the same walls" → "the same wall positions" (a unit test checks that
nothing else differs). Bathroom and kitchen, 8 images, same photos and seeds, scored beside v4:

| Room | v4 | v6 | Note |
| --- | --- | --- | --- |
| bathroom (no window) | 17 / 20, 1 small transom | **14 / 20, 3 invented windows** | Scandinavian: high small window, tiles and fixtures unchanged; loft and eclectic: full windows |
| kitchen | 16 / 20 | 16 / 20 | Scandinavian still keeps cabinets and tablecloth; classic and eclectic keep the cabinets |

**v6 is rejected**, and unlike v5 the result is attributable: that one phrase is what holds
invented windows back (1 → 3), and loosening it does not make the Scandinavian kitchen change
(16 → 16). The "barely changed" Scandinavian results are therefore not caused by "the same
walls"; the original kitchen and bathroom are already close to the style, which is at least
partly the rubric's problem (see v5 notes).

That leaves v3 against v4: the same total (70 / 80), but v4 invents one window in four
windowless bathrooms where v3 invents four. By this ADR's own rule, architecture errors decide.
**Decision: production moves to v4** (`currentPromptVersion`). Every job stores its
`promptVersion`, so real jobs can confirm it. The published examples stay as they are: each was
reviewed by eye, and the ones with invented windows were already rejected (ADR 0007).

## Follow-up: v7, the "already fits" sentence

v7 is v4 plus one sentence: "Even pieces that already look close to the new style are
replaced with new ones." Same 8 pairs and seeds:

| Room | v4 | v7 | Note |
| --- | --- | --- | --- |
| bathroom | 17 / 20, 1 window | 17 / 20, 1 window (classic) | Scandinavian swaps the vanity but keeps the blue tiles |
| kitchen | 16 / 20 | 16 / 20 | Scandinavian still keeps cabinets; eclectic better (new fronts), classic worse (cabinets kept) |

**No effect, so v7 is not adopted.** The one target, the Scandinavian kitchen, did not change;
the eclectic/classic swap is the size of the noise with one seed per pair. Three phrasings
(v4, v6, v7) now leave that kitchen alike: the model keeps what already matches, and more
prompt text does not override the photo. Further work there is not wording but either the
model's parameters (guidance, steps) or the rubric: a Scandinavian redesign of an
almost-Scandinavian kitchen may rightly look close to it. Production stays on v4.

## Consequences

- Any prompt change goes through the eval and is recorded here with its scores.
- Next steps: more photos (bathroom, hallway, a real photo with poor light), two seeds per
  pair, and a vision model as a second rater to reduce single-rater bias.

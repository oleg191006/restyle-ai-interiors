# ADR 0007: Before/after examples on landing pages

- Status: accepted
- Date: 2026-10-09

## Context

ADR 0004 and the programmatic SEO notes named the weak spot of the landing pages: their copy
is a template filled with room and style data, which Google can treat as thin content. The
strongest unique content for a "kitchen in loft style" page is an actual redesign of a
kitchen in loft style, and the product can produce exactly that.

## Decision

- `scripts/generate-examples.ts` renders one example per room × style with the production
  prompt (v3), the fixed "before" photos from `scripts/photos`, and the same seed per pair.
  It goes in order of search demand (room priority × style priority), reuses the v3 eval
  results for free, takes a `--limit`, and saves progress after every image.
- Images are committed to `public/examples` as 1024×768 WebP (~60–110 KB) and served through
  `next/image`, which produces AVIF/WebP variants per width. Measured at 640 px wide: AVIF
  16 KB, WebP 26 KB, against a 113 KB source. No extra service, same domain, same CDN.
- `src/data/examples.json` lists every pair with its prompt version and date. Pages render
  the section only when the pair is listed and not `rejected`, so examples roll out in
  batches without empty states.
- **Every batch is reviewed by eye before commit.** A bad pair is marked `rejected` with a
  reason; it stays in the manifest so it is not regenerated, and is never shown.
- Landing pages show the pair under the header (server-rendered, no client JS); hubs show
  the "after" image on cards, lazily loaded. Each image has a descriptive `alt`, the section
  says the "after" is AI-generated, and the sitemap lists both images (image sitemap).

## First batches

24 pairs generated, 21 published, 3 rejected.

All three bathroom results added a window to a windowless bathroom, the exact architecture
error v3 was chosen to avoid. The eval set (ADR 0006) has no windowless room, so the eval
could not catch it. Bathrooms are on hold in the generator (`HOLD_ROOMS`) until a windowless
room is in the eval set and a prompt passes it. Real visitors with such a bathroom hit the
same problem today.

## Performance

`next/image` with explicit width and height keeps CLS at 0.

Lighthouse CI caught a regression on the first version: on phones the pair was stacked, the
full-width "before" image became the LCP element, and `/uk/ideas/living-room/scandinavian`
went to LCP 2820 ms and performance 85. Showing the pair in two columns at every width fixed
it: each image downloads at ~375 px instead of 750 (13 KiB instead of 37 KiB on the page), the
comparison is visible without scrolling, and the lead paragraph is the LCP element again.

Same session, 5 runs each, mobile:

| Page | LCP median | Performance |
| --- | --- | --- |
| landing without example (control) | 2196 ms | 98 |
| landing with example, stacked | 2820 ms | 85 |
| landing with example, two columns | 2331–2463 ms | 96–97 |

Checked and ruled out: `next/image` adding client JS (script bytes are identical with and
without an example) and the first image's `fetchPriority="high"` (no measurable mobile
difference, kept because the image is the LCP element on desktop). The remaining
+150–250 ms is the images sharing the throttled connection with the text's render-critical
resources. The margin to the 2.5 s budget is small, so a flaky CI run here means look again.

While verifying this, the CI budgets themselves turned out to be fragile: `median-run`
checks every metric of one representative run, and on the unchanged room hub it picked a
run with LCP 2549 ms while the median LCP was 1677 ms. `lighthouserc.json` now uses
`aggregationMethod: "median"` (the median of each metric) over 5 runs instead of 3. With that,
all six pages pass: performance 96–99, LCP 1956–2245 ms.

## Consequences

- The repository grows by ~80 KB per published pair (~10 MB for all 120).
- Examples age with the prompt: `promptVersion` in the manifest shows which ones to
  regenerate when production moves to a new version.
- Generating the remaining pairs takes several days of the free allowance, shared with
  production traffic.

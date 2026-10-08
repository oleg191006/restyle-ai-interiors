# ADR 0002: System font stack instead of a web font

- Status: accepted
- Date: 2026-10-09

## Context

Lighthouse CI (mobile, simulated throttling, median of 3 runs) showed LCP at
2449–2565 ms against a 2500 ms budget. The LCP element is text (the `h1` on the home
page, the lead paragraph on landing pages), so there is no image to optimize. LCP
breakdown on `/uk`: TTFB 466 ms, Render Delay 1967 ms (81%).

Besides the HTML, the only high-priority requests were two preloaded Inter files
from `next/font` (Cyrillic 48 KiB + Latin 19 KiB). Scripts load at low priority and
CSS was already ~4 KiB.

## Experiments

Each row: `next build && lhci collect`, 3 runs per URL, median LCP.

| Variant | `/uk` | `/uk/ideas/living-room/scandinavian` |
| --- | --- | --- |
| Inter, `display: swap` (baseline) | 2449 ms | 2528 ms |
| + `experimental.inlineCss` | no change | no change |
| Inter, `display: optional` | 2565 ms | 2538 ms |
| **No web font (system stack)** | **2197 ms** | **2117 ms** |

`inlineCss` did not help because the stylesheet was never the bottleneck.
`display: optional` did not help because the cost is the preloaded bytes competing
for bandwidth, not the font swap repaint.

## Decision

Use Tailwind's default system stack (`ui-sans-serif, system-ui, sans-serif, …`):
Segoe UI on Windows, SF Pro on Apple devices, Roboto on Android. All of them cover
Cyrillic.

## Consequences

- LCP −250 to −400 ms, 67 KiB less on every first visit, no font-swap layout risk.
- The site looks slightly different per OS; there is no branded typeface.
- If a brand font is needed later, use it for headings only, subset it to the glyphs
  in use, and re-measure in Lighthouse CI before merging.
- The remaining ~1.6 s of render delay is attributed to the Next.js/React runtime JS
  (~140 KiB). Reducing it is a separate investigation.

# ADR 0003: Own field Web Vitals collection (RUM)

- Status: accepted
- Date: 2026-10-09

## Context

Lighthouse CI (ADR 0002) measures lab data: one emulated device, no real interactions.
Google ranks on field data (CrUX, p75 over 28 days), and INP can only be measured with
real users clicking. CrUX itself only reports origins and URLs with enough Chrome
traffic, which a new site does not have. We need our own field data.

## Options

| Option | Cost | Trade-off |
| --- | --- | --- |
| Vercel Speed Insights | Free tier with a monthly event cap | One line to add; data and aggregation live in Vercel's dashboard |
| Google Analytics 4 events | Free | Third-party script on every page (our CI budget allows zero); p75 needs BigQuery export |
| **Own endpoint + Postgres** | Free (Neon) | We write ~100 lines and own the queries |

## Decision

Own collection:

1. `components/web-vitals.tsx` (client, mounted in the `[locale]` layout) uses Next's
   `useReportWebVitals`, queues metrics and sends one `sendBeacon` per page when it is
   hidden, or early after 20 samples. The listener is registered after the hook's own
   subscriptions, otherwise the final LCP, CLS and INP (reported on `visibilitychange`)
   arrive after the queue was already flushed. This was caught by an end-to-end test.
2. `POST /api/vitals` drops crawlers and lab tools by user agent, validates every field,
   collapses the path to a route template and stores rows in `WebVital`.
3. `pnpm vitals:report [days]` computes p75 per route template, metric and form factor
   with `percentile_cont(0.75)` and rates it against the Core Web Vitals thresholds.

## Follow-up: INP attribution

The first production report showed INP 2072 ms (2 samples, author's phone) while
throttled emulation (CPU ×6, slow 4G) gave 56–120 ms for every scenario. Lab cannot
explain it, so INP samples now carry attribution taken from `metric.entries` (Event
Timing): event type, target element, start time since navigation, and the
input delay / processing / presentation split. The API rebuilds this object field by
field with bounded values. `pnpm vitals:report` lists the slowest interactions.

Second report: one 720 ms INP stored six times, because web-vitals re-reports a
metric on every `visibilitychange` to hidden. Fixed with `metricId`: the client skips
unchanged repeats and the report keeps the latest row per `metricId`. The interaction
itself was input delay 18 + processing 0 + presentation 702 ms, so attribution now also
includes every event of the interaction and the overlapping Long Animation Frames with
their top scripts, to see what kept the next frame from being painted.

Third report: duplicates with different ids. Switching language changes the root layout
within the same document, the hook subscribes again and reports the same interaction
under a new web-vitals id. The client now keys metrics by document + navigation + name.
The 2992 ms interaction (presentation 2975 ms, no long animation frames) did not
reproduce in emulation (early tap, long press, slow network to an uncached page,
language switch: all under 120 ms), so it is device- or browser-specific.

All production samples so far came from an iPhone 15 on Safari. Safari only exposes
Event Timing since 26.2 (December 2025), its INP is reported to be inflated by bugs,
and it has no Long Animation Frames, which is why no frame data arrived. CrUX, the field
data Google ranks on, is Chrome-only and excludes iOS entirely. Samples now carry a coarse
`browser` family (chrome, edge, firefox, safari, ios, other) and the report computes p75
per browser, so iOS numbers are visible but never mixed into the Chrome figures that
matter for search.

## Consequences

- No third-party script; client JS did not measurably grow (web-vitals already ships
  in the Next.js runtime).
- One small insert per page view into Neon. If traffic grows, sample on the client
  (for example 10% of sessions) or move to a time-series store.
- The endpoint is public. Validation bounds what can be written, but there is no rate
  limiting yet; add it before the site gets real traffic.
- Production needs the `web_vitals` migration applied to Neon before deploy.

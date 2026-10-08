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

## Consequences

- No third-party script; client JS did not measurably grow (web-vitals already ships
  in the Next.js runtime).
- One small insert per page view into Neon. If traffic grows, sample on the client
  (for example 10% of sessions) or move to a time-series store.
- The endpoint is public. Validation bounds what can be written, but there is no rate
  limiting yet; add it before the site gets real traffic.
- Production needs the `web_vitals` migration applied to Neon before deploy.

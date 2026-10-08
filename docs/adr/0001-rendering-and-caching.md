# ADR 0001 — Rendering and caching strategy

- Status: Accepted
- Date: 2026-10-08

## Context

Restyle publishes programmatic landing pages for every `room × style × locale`
combination (8 × 15 × 2 = 240 today, designed for 50 000+). Pages are read-mostly,
change only when the content team edits data, and must be fast (LCP ≤ 2.5 s at p75)
and fully indexable. Next.js 16 makes caching explicit (`cacheComponents: true`):
nothing is cached unless a component or function opts in with `"use cache"`.

## Decision

1. **Server Components by default.** Landing pages ship no client JS except the
   upload widget (added later as a small client island).
2. **Data functions are cached, not pages.** Every Prisma read used by a page lives
   in `src/lib/data.ts`, marked `"use cache"`, with `cacheLife("days")` and a
   `cacheTag` per entity (`room:<slug>`, `style:<slug>`, `pages`).
3. **Build only the head of the distribution.** `generateStaticParams` returns the
   top combinations by `room.priority × style.priority` (top 40 per locale). The
   long tail renders on first request and is then served from cache.
4. **Invalidation by tag.** Content edits call `revalidateTag("style:<slug>", "max")`
   (stale-while-revalidate) from an admin action; a user-facing write that must be
   seen immediately would use `updateTag` instead.
5. **Unknown combinations return a real 404** via `notFound()`, never an empty indexable page.
   With Partial Prefetching, an unlisted URL first gets the App Shell with status 200 and
   `notFound()` only streams in later. That is a soft 404 for crawlers: measured
   `/uk/ideas/garage` → 200. Fix: `ensureStatic = "navigation"` on the `[locale]` root layout,
   so the first request for an unlisted URL waits for the complete static render. After the
   fix: unknown URL → 404; long-tail page → 200 in ~0.9 s on first hit, ~12 ms from cache after.

## Consequences

- Build time stays flat as the dataset grows; only the prerender budget is tuned.
- The first visitor to a long-tail page pays one render; everyone after gets the cached HTML.
- Reading `cookies()`/`headers()` inside a landing page would make it dynamic.
  Personalisation (A/B variant, auth state) must happen in `proxy.ts` rewrites or
  in client islands, never in the page tree (see a later ADR on A/B).

# Restyle

SEO-first AI interior redesign. Programmatic landing pages for every
`room × style × locale` (8 × 15 × 2 = 240), built on Next.js 16 Cache Components.

## Stack

- `apps/web` — Next.js 16.4 App Router, Server Components, Tailwind 4
- `packages/db` — Prisma 7 + PostgreSQL 18 (driver adapter `@prisma/adapter-pg`), seed data
- `docs/adr` — architecture decisions

## Run locally

```bash
pnpm install
pnpm db:up                 # Postgres (:5433) and S3Mock storage (:9090) in Docker
pnpm db:migrate            # apply migrations
pnpm db:seed               # 8 rooms, 15 styles, 240 pages
pnpm qstash:dev            # local queue on :8180 (separate terminal)
pnpm dev                   # http://localhost:3000
```

Production check: `pnpm build && pnpm --filter web start`.

## CI

Every push and PR runs `.github/workflows/ci.yml`: a throwaway Postgres and S3Mock start, the database is migrated and seeded, then lint, typecheck, unit tests, build, **end-to-end tests** and **Lighthouse CI** (6 pages × 5 runs, mobile, median of each metric). Budgets live in `lighthouserc.json`; a PR fails if the median performance score drops below 90, LCP exceeds 2.5 s, CLS exceeds 0.1, or JS grows past 200 KB.

Locally: `pnpm build && pnpm lhci` (needs Chrome; set `CHROME_PATH` if it is not found).

## Tests

Two layers, neither spends AI quota (ADR 0009):

```bash
pnpm --filter web test       # Vitest: pure logic and route handlers with I/O mocked, < 1 s
pnpm db:up && pnpm build
pnpm --filter web test:e2e   # Playwright + installed Chrome: real upload → queue → worker → result
```

The end-to-end run starts `next start` and the QStash dev server itself (or reuses running ones
locally) and uses the fake AI provider.

## Field metrics (RUM)

Real-user Core Web Vitals are collected by `components/web-vitals.tsx` → `POST /api/vitals` → `WebVital` table (bots and Lighthouse are dropped). See ADR 0003.

```bash
pnpm vitals:report        # p75 per page type, metric and device, last 28 days
pnpm vitals:report 7      # last 7 days
```

## Redesign tool

`/[locale]/redesign`: upload a room photo, pick a style, get a redesign (ADR 0005).

```
browser resize (≤ 504 px, drops EXIF) → presigned PUT to storage → POST /api/generations
→ QStash → /api/generations/run → AI provider → storage → browser polls for the result
```

- `AI_PROVIDER=fake` (default) tints the photo locally and costs nothing; `cloudflare` calls
  FLUX.2 [klein] 4B on Workers AI.
- Storage is S3Mock locally and Cloudflare R2 in production, through the same S3 API.
- Copy `apps/web/.env.example` to `apps/web/.env.local`; it already holds the QStash dev server's
  fixed credentials, so `pnpm qstash:dev` works without copying keys.
- Prompts are versioned in `lib/ai/prompt.ts`. Compare versions on a fixed photo set before switching
  (ADR 0006): `pnpm --filter web eval:prompts v2 v3` writes contact sheets to `apps/web/scripts/eval/out`
  (needs the Cloudflare variables in `.env.local`; ~110 neurons per image, ~1,750 per version;
  `--rooms=bathroom,kitchen` runs a subset).

## Accounts and plans

Email + password through Better Auth, sessions in Postgres (ADR 0010). Pages stay static: the
account page and the tool read `GET /api/account` from the browser.

| Plan | Generations per 24 h |
| --- | --- |
| Guest (visitor cookie) | 2 |
| Free (signed in) | 5 |
| Pro ($9 / month, Stripe) | 30 |

Set `BETTER_AUTH_SECRET` in `.env.local` (any long random string locally).

### Billing (Stripe test mode, ADR 0011)

```
account page → POST /api/billing/checkout → Stripe Checkout → Stripe → POST /api/stripe/webhook
            → Subscription row (copy of Stripe's state) → plan = pro
account page → POST /api/billing/portal → Stripe Customer Portal (card, invoices, cancel)
```

1. Put a test key in `.env.local`: `STRIPE_SECRET_KEY=sk_test_…`
2. `pnpm --filter web stripe:setup` creates the Pro product and price (found by lookup key) and a portal configuration.
3. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and forward webhooks:
   `stripe listen --api-key $STRIPE_SECRET_KEY --forward-to localhost:3000/api/stripe/webhook`;
   put the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
4. Test card `4242 4242 4242 4242`, any future date and CVC. `e2e/billing.spec.ts` walks
   Checkout → Pro → portal → cancel; it is skipped when billing is not configured (CI).

## Analytics and the paywall experiment

PostHog from the server only (ADR 0012): no analytics script on landing pages. Funnel events are
recorded where they happen (`generation_requested`, `limit_reached`, `signed_up`, `paywall_viewed`,
`checkout_started`, `subscription_started`, …); page views come from one small beacon
(`/api/events`). The feature flag `paywall-trial` splits eligible Free users 50/50 between paying
now and a 7-day trial (Stripe `trial_period_days`). Set `POSTHOG_KEY` and `POSTHOG_HOST` to enable.

## Before/after examples

Each landing page shows a real redesign of its room in its style (ADR 0007), the unique content
programmatic pages need. Generated in batches by search demand, reviewed by eye, then committed:

```bash
pnpm --filter web examples:generate --limit 20   # needs the Cloudflare variables in .env.local
```

Images go to `apps/web/public/examples`, the list to `apps/web/src/data/examples.json`. Mark a bad
result with `"rejected": "<reason>"`; it is never shown and never regenerated.

## Routes

| URL | Rendering |
| --- | --- |
| `/uk`, `/en` | static |
| `/[locale]/ideas/[room]` | static (all rooms) |
| `/[locale]/styles/[style]` | static (all styles) |
| `/[locale]/redesign` | static shell, client form; room and style preselected from the query |
| `/[locale]/account` | static shell, client panel; `noindex` |
| `/api/auth/*` | Better Auth (sign-up, sign-in, sign-out, session) |
| `/api/account` | who is signed in, plan, used today, subscription, Pro offer |
| `/api/billing/checkout`, `/api/billing/portal` | Stripe Checkout and Customer Portal sessions |
| `/api/stripe/webhook` | Stripe events, signature-verified, idempotent |
| `/api/events` | page-view beacon → PostHog |
| `/[locale]/ideas/[room]/[style]` | top 40 per locale at build, rest on first visit then cached |
| `/sitemap.xml`, `/robots.txt` | static, hreflang alternates in sitemap |
| `/` | 307 to `/uk` or `/en` by `Accept-Language` (`src/proxy.ts`) |

## SEO checklist (done)

- `generateMetadata` with title, description, canonical, hreflang (`uk-UA`, `en`, `x-default`)
- JSON-LD: `BreadcrumbList` on every inner page, `FAQPage` on landing pages
- Real 404 for unknown combinations (no soft 404, see ADR 0001)
- System font stack (no web font download, see ADR 0002), no client components on landing pages

## Notes

- Windows: if `pnpm install` hangs while linking, run `pnpm config set package-import-method copy --location=global`.

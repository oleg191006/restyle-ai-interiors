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
pnpm db:up                 # Postgres in Docker on :5433
pnpm db:migrate            # apply migrations
pnpm db:seed               # 8 rooms, 15 styles, 240 pages
pnpm dev                   # http://localhost:3000
```

Production check: `pnpm build && pnpm --filter web start`.

## Routes

| URL | Rendering |
| --- | --- |
| `/uk`, `/en` | static |
| `/[locale]/ideas/[room]` | static (all rooms) |
| `/[locale]/styles/[style]` | static (all styles) |
| `/[locale]/ideas/[room]/[style]` | top 40 per locale at build, rest on first visit then cached |
| `/sitemap.xml`, `/robots.txt` | static, hreflang alternates in sitemap |
| `/` | 307 to `/uk` or `/en` by `Accept-Language` (`src/proxy.ts`) |

## SEO checklist (done)

- `generateMetadata` with title, description, canonical, hreflang (`uk-UA`, `en`, `x-default`)
- JSON-LD: `BreadcrumbList` on every inner page, `FAQPage` on landing pages
- Real 404 for unknown combinations (no soft 404, see ADR 0001)
- `next/font` (Inter, latin + cyrillic), no client JS on landing pages

## Notes

- Windows: if `pnpm install` hangs while linking, run `pnpm config set package-import-method copy --location=global`.

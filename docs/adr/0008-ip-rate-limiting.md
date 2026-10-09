# ADR 0008: IP rate limiting on Postgres

- Status: accepted
- Date: 2026-10-09

## Context

ADR 0005 listed a known gap: the per-visitor daily limit is keyed by a cookie, so a client
that drops the cookie gets a fresh allowance, and uploads were not limited by count at all.
The global daily cap protected the AI budget, but one abusive client could still spend that
whole cap and fill storage with uploads. All public write endpoints need a limit that does
not depend on the client's cooperation.

## Options

| Option | For | Against |
| --- | --- | --- |
| Upstash Redis + `@upstash/ratelimit` | Standard, fast, atomic sliding windows | Another service, more secrets |
| Vercel Firewall rate-limit rules | No code | Plan-dependent; limits live outside the repo |
| **Postgres table of hits** | No new service; same database, same migrations | One extra write per limited request; count-then-insert is not atomic |

## Decision

`lib/rate-limit.ts` counts requests per action and client IP over one or more windows in a
`RateLimitHit` table and answers `429` with `Retry-After` when a window is full.

| Endpoint | Per IP | Also |
| --- | --- | --- |
| `POST /api/uploads` | 10 / minute, 30 / day | 5 / day per visitor cookie |
| `POST /api/generations` | 15 / day | 5 / day per visitor, 50 / day site-wide |
| `POST /api/vitals` | 60 / minute | bots and lab tools dropped |

- The IP limit is higher than the cookie limit because many people can share one IP
  (mobile carrier NAT, offices). The cookie limit keeps the per-person experience; the IP
  limit stops a client that discards cookies.
- The check runs before validation, so a flood of malformed requests is also cut off early.
- **No raw IPs are stored.** The key is `action:HMAC-SHA256(ip, RATE_LIMIT_SALT)`. A plain hash
  would not be enough: the IPv4 space is small enough to reverse it by brute force.
- Rows older than two days are deleted opportunistically (1% of requests).

## Verified

Locally, with `X-Forwarded-For` set as Vercel's edge sets it and the cookie dropped on every
request: uploads 1–10 → 200, 11–12 → 429 with `Retry-After: 60`; another IP right after → 200;
62 vitals beacons from one IP → 60 accepted, 2 limited; no key in the table contains an IP.

## Consequences

- Production needs `RATE_LIMIT_SALT` (a random secret). Changing it resets all counters.
- Relies on Vercel overwriting `X-Forwarded-For` with the real client IP. Verify after deploy
  by sending a spoofed header: if a spoofed IP gets a fresh allowance, the key must come from
  a header the client cannot set.
- Count-then-insert can let a burst overshoot by a few requests. Fine for abuse protection;
  not for billing.
- At real traffic, every limited request costs two queries and one insert on Neon. Move to
  Redis when that shows up in database load.

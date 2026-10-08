# ADR 0004: URL structure and internal linking

- Status: accepted
- Date: 2026-10-09

## Context

Programmatic pages only rank if Google can find them, understand how they relate, and
never sees the same content under two URLs. The URL scheme is also a contract: changing
it later costs 301 redirects and some of the accumulated signals.

## Decision

### URL scheme

```
/{locale}                          home
/{locale}/ideas                    all rooms
/{locale}/ideas/{room}             room hub: 15 styles for this room
/{locale}/ideas/{room}/{style}     landing page
/{locale}/styles                   all styles
/{locale}/styles/{style}           style hub: palette + this style in 8 rooms
```

- Locale is the first segment (`uk`, `en`), not a subdomain or a cookie, so each language
  has its own crawlable URL and one deployment serves all of them (see ADR 0001 for hreflang).
- Slugs are English, lowercase, hyphenated and stable across languages. Translating a
  room name never changes its URL.
- `room/style` order mirrors the hub hierarchy: the room hub is the parent of its
  landing pages, which matches how people search ("kitchen ideas" → "loft kitchen").
- Every path prefix is a real page. Trimming a landing URL leads to a hub or an index,
  never a 404, and breadcrumbs mirror the path exactly.
- No IDs and no query parameters in canonical URLs. Canonicals never include the query,
  so `?utm_source=…` variants collapse into one URL.

### One URL per page

Measured before the change and fixed in `proxy.ts` and Next defaults:

| Request | Before | After |
| --- | --- | --- |
| `/uk/ideas`, `/uk/styles` | 404 | 200, index pages |
| `/UK/ideas/kitchen` | 307 → `/uk/UK/ideas/kitchen` → 404 | 308 → `/uk/ideas/kitchen` |
| `/uk/IDEAS/kitchen/LOFT` | 404 | 308 → lowercase |
| `/uk/ideas/kitchen/` | 308 → no trailing slash | unchanged |
| `/uk//ideas/kitchen` | 308 → single slash | unchanged |
| `/uk/ideas/garage` | 404 | unchanged |

On Windows, `next start` served `/uk/ideas/Living-Room` with 200 because the
prerendered file lookup is case-insensitive there; production on Linux returned 404.
The lowercase redirect makes behaviour identical everywhere.

### Internal linking

```
home ──► ideas index ──► room hub ──► landing ◄──┐
  │                                     │  ▲      │ "other styles for this room"
  └────► styles index ──► style hub ────┘  └──────┘ "this style in other rooms"
```

- Every landing page is two clicks from home (home → hub → landing).
- Each landing page links to 8 other styles of the same room and the same style in the
  7 other rooms, so no page is an orphan and link equity spreads sideways, not only down.
- Breadcrumbs (visible and `BreadcrumbList` JSON-LD) give Google the hierarchy explicitly.

## Consequences

- 292 URLs in the sitemap, all reachable by links as well.
- Adding a room or a style adds one hub and 15 or 8 landing pages per locale with no
  routing changes.
- Changing a slug later requires a 301 from the old URL; slugs should be treated as
  permanent once indexed.
- Adding a language means a new first segment and new dictionary entries; slugs stay.

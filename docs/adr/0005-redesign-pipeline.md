# ADR 0005: Photo redesign pipeline

- Status: accepted
- Date: 2026-10-09

## Context

The product: a visitor uploads a photo of a room, picks a style, and gets a redesigned
image. Constraints:

- Everything on free tiers: Vercel Hobby, Neon, Cloudflare (Workers AI, R2), Upstash QStash.
- Workers AI FLUX.2 [klein] edits from reference images (`input_image_0..3`), but every
  input must be smaller than 512×512, and the free allowance is 10,000 neurons per day.
  Measured from the published prices: klein 9B ≈ 1,400 neurons per 1024×768 edit (~7 a
  day), klein 4B ≈ 160 (~60 a day).
- Vercel functions cap request bodies at 4.5 MB; phone photos are often bigger.
- Landing pages must stay static and fast (ADR 0001–0003): the tool cannot add weight to them.

## Decision

```
browser                      Vercel (Next.js)                  external
───────                      ────────────────                  ────────
1. pick photo
2. resize to ≤ 504 px,
   re-encode JPEG
   (drops EXIF/GPS)
3. POST /api/uploads ──────► presigned PUT URL ──────────────► R2 (S3 API)
4. PUT photo ──────────────────────────────────────────────────► R2
5. POST /api/generations ──► row: queued ──── publish ─────────► QStash
                                                                   │ retries,
6. poll GET /api/generations/:id                                   │ parallelism
                             /api/generations/run ◄────────────────┘
                               verify QStash signature
                               read input from R2
                               call provider ─────────────────► Workers AI
                               write output to R2
                               row: done | failed
7. show before / after
```

1. **Resize in the browser.** The model needs < 512 px anyway, so the client downscales to
   504 px on the long side (a multiple of 8) and re-encodes to JPEG. Uploads become ~50 KB
   instead of 5 MB, and re-encoding strips EXIF, including GPS coordinates.
2. **Upload straight to R2 with a presigned URL.** The file never passes through a Vercel
   function, so the 4.5 MB body limit and function time do not matter. The URL is valid for
   5 minutes, for one key, one content type.
3. **Queue the generation with QStash**, not inline in the request:
   - the visitor can close the tab; the job still finishes;
   - transient AI errors are retried with backoff, with a dead-letter queue for the rest;
   - queue parallelism caps concurrent calls, which protects the free daily allowance;
   - the worker endpoint is idempotent: a retry of a finished job is a no-op.
   A synchronous call would be simpler, and klein's 4 fixed steps take seconds, so the
   queue is a deliberate choice for reliability and cost control, not for speed.
4. **Poll for status** every 2 s. Server-sent events would push updates, but polling one
   tiny cached-nothing endpoint is simpler and fine at this scale.
5. **Provider interface** with two implementations: `cloudflare` (FLUX.2 klein 4B over the
   REST API) and `fake` (tints the input with the style palette using sharp). Development
   and CI use `fake`, so they never spend the daily allowance.
6. **Storage interface over the S3 API**: R2 in production, MinIO in Docker locally. Same
   code path, same presigned-URL flow.
7. **Abuse and budget limits** before the AI call: per-visitor daily limit and a global
   daily cap below the free allowance. Over the cap the job fails fast with a clear message
   instead of incurring cost.

## Data

`Generation`: id, status (`queued | running | done | failed`), input key, output key,
room, style, locale, provider, error, attempts, timings, visitor id (random cookie, no
personal data).

## Implementation notes

Found while building and testing the pipeline end to end:

- **Presigned uploads and SDK checksums.** AWS SDK ≥ 3.729 signs a CRC32 of the body into
  every request. For a presigned URL that is the checksum of an empty body, so the browser's
  real upload is rejected, and the error response has no CORS headers, so the browser only
  reports "CORS error". R2 has the same incompatibility. The client sets
  `requestChecksumCalculation: "WHEN_REQUIRED"`.
- **Local S3.** MinIO no longer publishes free images, so local development uses Adobe
  S3Mock (any credentials, permissive CORS). Its image runs as uid 1000 while a fresh named
  volume is owned by root, so it runs as root in docker-compose. Local only.
- **Retry policy is inverted**: everything is retried except `PermanentError` (rejected
  input, unknown room or style, Workers AI 4xx other than 429). Verified by stopping the
  storage container mid-job: attempt 1 failed, QStash retried ~15 s later, attempt 2 finished.

Verified end to end in a browser: a 1600×1200 photo with GPS EXIF is stored as 504×378 with
no metadata; the worker rejects unsigned calls (401); another visitor's job is a 404; another
visitor's upload key is a 400; non-JPEG and oversized uploads are a 400; the sixth job of the
day is refused with 429. The tool page scores Performance 98 with 145 KiB of JS.

First real runs with FLUX.2 [klein] 4B:

- A call takes 7.5–25 s, not "seconds": queueing on the Workers AI side varies.
- A vague prompt ("replace furniture, decor and finishes") only swapped the sofa. Listing
  what to keep (walls, windows, doors, ceiling, camera angle) and what to replace
  (wall finishes, flooring, curtains, lights, furniture, decor, clutter) produced a full
  redesign. At the default guidance the model invented architecture (a stone column);
  `guidance: 7` kept the room. Compared on one photo and one seed only, so treat it as a
  starting point and evaluate on a set of rooms and styles.
- Output is softer than the original because the input is capped below 512 px.

## Known gaps

> Addressed by ADR 0008 (IP rate limiting on all public write endpoints).

- **Per-visitor limits are cookie based**, so a client that drops cookies gets a fresh
  allowance. They stop honest overuse only. The global daily cap is what protects the AI
  budget. Before a public launch add IP-based rate limiting (for example Upstash Ratelimit)
  on `/api/uploads` and `/api/generations`.
- Uploads are bounded by size (1 MB) and URL lifetime (5 minutes) but not by count until a
  visitor has used the daily generations.

## Consequences

- The tool page is a separate route with one client component; landing pages only link to
  it with the room and style preselected, so their JS budget is untouched.
- Local development needs Docker (Postgres, MinIO) and the QStash dev server.
- Production needs a Cloudflare account (Workers AI token, R2 bucket and keys) and an
  Upstash account (QStash token and signing keys).
- Uploaded photos are personal data in a broad sense (someone's home). Inputs are deleted
  after 7 days via an R2 lifecycle rule; the privacy note on the tool page says so.

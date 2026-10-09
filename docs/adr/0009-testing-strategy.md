# ADR 0009: Testing strategy

- Status: accepted
- Date: 2026-10-09

## Context

Until now CI checked lint, types, the build and Lighthouse budgets. The redesign pipeline
(ADR 0005) and the rate limits (ADR 0008) were verified by hand with curl and a browser, once.
The parts most likely to break silently are not visible on a page: the worker's status codes
drive QStash retries, the rate limiter's windows, the proxy's redirects. A regression there
costs AI quota or lets abuse through before anyone notices.

Constraints: no paid services and no AI quota in CI, and the suite must stay fast enough to run
on every push.

## Decision

Two layers.

| Layer | Tool | What is real | What is replaced | Time |
| --- | --- | --- | --- | --- |
| Unit | Vitest | the function or route handler | database, storage, queue, AI (`vi.mock`) | < 1 s |
| End to end | Playwright | browser, `next start` build, Postgres, S3Mock, QStash dev server | AI: the `fake` provider | ~15 s |

**Unit tests** cover logic with many cases or a contract with another system:

- the worker (`/api/generations/run`): 401 without a QStash signature; 503 (retry) for
  transient errors, 200 (stop) for `PermanentError`, an unknown room and the last attempt;
  redelivered finished jobs do nothing (idempotency); the prompt version is stored;
- the rate limiter: windows, separate counts per IP and per action, the first
  `X-Forwarded-For` entry as the client, refused requests not recorded, no raw IP in the key;
- the proxy: lowercase 308, locale 307 by `Accept-Language`, localized URLs untouched;
- canonical and hreflang (`alternatesFor`), RUM route templates and browser families, and the
  prompt versions (v4 must not mention a window position or daylight).

**One end-to-end test** walks the whole pipeline in a real browser: a 1600×1200 photo with
GPS EXIF is uploaded on `/en/redesign?room=kitchen&style=loft`, and the test waits for the
result, then checks that the stored input is at most 504 px with no EXIF and that the output
is 1024×768. Two request-level checks ride along: the worker refuses unsigned calls, unknown
pages are real 404s and mixed case redirects.

Choices:

- **Mocks only at the I/O edge.** The worker test mocks Prisma, storage and the queue, but runs
  the real route code and the real prompt builder, so it tests our logic, not the mocks.
- **Tests were checked against deliberately broken code** (manual mutation testing). Five
  mutations: no `PermanentError` check in the worker (2 tests fail), refused requests recorded
  by the limiter, the last instead of the first `X-Forwarded-For` entry, 301 instead of 308, and
  reading only the first `Accept-Language` entry. The last one survived: the test used
  `de, uk`, and `uk` is also the default, so it passed either way. It now uses `de, en`. A test
  that cannot fail is noise.
- **The installed Google Chrome** (`channel: "chrome"`), not a Playwright-downloaded browser:
  GitHub runners have it, Lighthouse CI already uses it, and nothing extra is downloaded.
- **The QStash dev server's fixed credentials** are public, so they sit in the workflow and in
  `.env.example`; no CI secrets are needed.
- The e2e user agent carries `restyle-e2e`, which `/api/vitals` drops, so test runs never reach
  field metrics.

## Not covered

- The Cloudflare provider and image quality: calls cost quota and results need a human eye.
  That is the job of the prompt eval (ADR 0006).
- Real R2 and production QStash: covered by the manual production checks in ADR 0005/0008.
- Visual regressions and other browsers. Safari matters for field data (ADR 0003), but the tool
  uses only standard APIs (`createImageBitmap`, canvas, `fetch`).
- Database-level behaviour (count-then-insert races, the cleanup query): the rate-limit test
  uses an in-memory table. A test against real Postgres would catch query mistakes and is the
  next step if the limiter grows.

## Consequences

- CI runs unit tests before the build and the e2e test after it; a failure uploads the
  Playwright report (traces kept on failure).
- Local e2e needs `pnpm db:up` and a production build; it reuses already running servers.
- New pipeline behaviour comes with a unit test; a new user flow comes with an e2e step.

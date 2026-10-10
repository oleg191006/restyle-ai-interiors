# ADR 0015: 👍 / 👎 on results, per prompt version

- Status: accepted
- Date: 2026-10-10

## Context

Prompts are chosen on a fixed eval set (ADR 0006): 4 photos × 4 styles, one seed per pair, one
rater. Seven versions in, that set has stopped telling versions apart. v7 moved one style up and
another down, which is the size of the noise, and three phrasings left the Scandinavian kitchen
alike. Each job already stores its `promptVersion`, but nothing records whether the result was
any good.

## Decision

- **A rating under every result.** "How is the result?" with 👍 and 👎. After 👎 the person can
  pick a reason. The reasons are the eval rubric's failure modes in plain words:
  "added windows or doors" (architecture), "barely changed", "doesn't look like this style",
  "poor image quality". The field data and the eval then speak the same language.
- **Stored on the job.** `Generation.rating` (`up` / `down`), `ratingReason` and `ratedAt`, beside
  `promptVersion`, room and style. No separate table: one answer per job, and rating again
  replaces it.
- **"Down" is saved at once**, so it counts even when no reason is picked; a reason updates it.
- **Only the owner can rate.** `POST /api/generations/:id/feedback` checks the visitor cookie like
  the status route (someone else's job is a 404) and accepts only finished jobs (409 otherwise).
- **One validator for both sides.** `lib/feedback.ts` parses the body. Its reason list is a
  `Record` over the Prisma enum, so the database and the UI cannot drift without a type error.
- **Also an analytics event**, `generation_rated` with the prompt version, so PostHog can break it
  down further. The database stays the source for the report.
- **Read with `pnpm feedback:report [days]`**: per prompt version, jobs, share rated, share 👍 and
  the down reasons. Versions with fewer than 30 ratings are flagged as too few to compare.

## Consequences

- A prompt change can now be judged twice: on the eval set before release and on real photos
  after it. v4 went to production on 2026-10-10; its first weeks of ratings are the baseline.
- Ratings are self-selected, since unhappy people are more likely to click, so the share of 👍 is
  biased. It is comparable between versions served to the same traffic, not as an absolute
  quality score.
- Rolling out needs the migration on production first (`prisma migrate deploy`). The columns are
  nullable additions, so the running version is unaffected; deploying the code first would break
  every query that reads a generation.
- Not done: rating from the account history, and a free-text comment. Both fit the same columns
  plus one text field.

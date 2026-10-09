# ADR 0014: Redesign history on the account page

- Status: accepted
- Date: 2026-10-09

## Context

The account page showed an email, a plan and a usage line. It gave no reason to come back, and
"create an account" offered only a higher daily limit. A finished redesign was reachable only
until the person left the tool page.

The photos are personal data in a broad sense: someone's home. The tool promises that they are
deleted after 7 days (R2 lifecycle rule, ADR 0005).

## Decision

- **Accounts only.** `GET /api/account/generations` needs a session (401 otherwise). Generations
  started as a guest stay with the visitor cookie and are not listed, even after sign-up: a
  cookie is not an identity worth showing private photos to later.
- **Only what still exists.** The list is the account's `done` jobs from the last 7 days, newest
  first, at most 12. Older rows remain in the database for statistics, but their photos are gone,
  so listing them would show broken images and contradict the privacy note.
- **Signed URLs, no caching.** Each item carries one-hour presigned URLs for the input and the
  result, the same as the tool's status endpoint; the response is `private, no-store`.
- **The page stays static.** The panel fetches the history from the browser after the session
  arrives, like the rest of the account data (ADR 0010). Room and style names are static, so they
  come with the page and the API returns slugs.
- **Layout.** Signed in: an account card (initial, email, plan badge, today's usage with a bar,
  subscription state, sign out) and the Pro offer as a dark card beside the history grid, where
  each item is the before/after slider with Download and "Another style". Signed out: the form
  beside what an account gives (limits from `lib/entitlements.ts`, history, any device, Pro).

## Consequences

- Creating an account has a second, concrete benefit, stated next to the form.
- Download is shared with the tool (`downloadImage` in `lib/account-client.ts`): storage is on
  another origin, where the `download` attribute is ignored, so the file is fetched into a blob.
- The e2e funnel test now ends on the account page and checks the new redesign is listed.
- Not done: moving a guest's generations to the account at sign-up, and deleting one item by
  hand. Both are possible later without changing this API's shape.

# ADR 0010: Accounts, plans and entitlements

- Status: accepted (accounts and plans); Stripe subscriptions follow in a separate step
- Date: 2026-10-09

## Context

The product is a subscription business: free use leads to a paid plan. That needs three
things the site did not have: knowing who a person is across devices, a set of plans with
different allowances, and a funnel from "out of free generations" to "signed in" and later to
"paid". Constraints from earlier decisions:

- Every page under `[locale]` is fully static (`ensureStatic = "navigation"`, ADR 0001). A
  session-aware header would make every landing page dynamic.
- No new paid services; secrets only in environment variables.

## Decision

**Better Auth** with email and password, sessions in Postgres through its Prisma adapter.
Google sign-in is one `socialProviders` entry once an OAuth client exists.

| Option | For | Against |
| --- | --- | --- |
| **Better Auth** | Own database, TypeScript-first, Prisma adapter, Next.js handler; Auth.js is now developed under it | Young API; one more dependency to keep current |
| Auth.js v4 | Well known | Maintenance mode |
| Clerk / Auth0 | Hosted UI, MFA | Users live in someone else's system; paid beyond free tiers |
| Own sessions | Full control | Password hashing, CSRF, session rotation are easy to get wrong |

**Pages stay static.** Nothing that renders a page reads the session. The header has a plain
"Account" link; `/[locale]/account` is a static shell whose client component asks
`GET /api/account` (email, plan, used today, limit). The tool asks the same endpoint for its
"Today: 1 of 2" line. Session reads happen only in API routes.

**Entitlements, not payment checks.** `lib/entitlements.ts` maps a plan to what it allows;
features ask "what is this person entitled to", never "did they pay". Changing a price or
adding a plan does not touch the features.

| Plan | Who | Generations per 24 h |
| --- | --- | --- |
| anonymous | no account, counted by visitor cookie | 2 |
| free | signed in, counted by account on any device | 5 |
| pro | active subscription (next step) | 30 |

The site-wide daily cap (ADR 0005) still applies above all plans: it protects the free AI
allowance, so the Pro number is a product setting, not a promise the free tier could keep at
scale. Failed jobs no longer count against the person.

**Funnel, step 1.** When a guest hits the limit, the error carries the plan
(`limit_plan:anonymous`), and the tool offers "Sign in" with
`/account?next=/redesign?room=…&style=…`. After sign-up the person lands back in the tool with
the same room and style and the Free allowance. `next` accepts only same-site paths, so it
cannot be used as an open redirect.

## Security

- Passwords: scrypt with a per-password salt (Better Auth default); minimum 8 characters.
- Session: random token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over https), 30 days,
  stored in the `session` table so it can be revoked.
- CSRF: Better Auth rejects state-changing requests from other origins (verified: 403).
- Guessing and mass sign-up: sign-in and sign-up go through the IP limiter (ADR 0008) before
  Better Auth sees them, 10 per minute and 50 per day per IP. Better Auth's own limiter is off:
  its default memory store does not survive serverless instances.
- Better Auth telemetry is off.
- The account page is `noindex, nofollow` and not in the sitemap.

## Verified

Locally with curl: guest → 2/day; sign-up → Free 5/day; sign-out → guest again; wrong
password → 401; sign-in → 200; sign-in from another `Origin` → 403; the stored password is a
salted scrypt hash. Playwright walks the funnel in a browser: two guest generations, the third
is refused with a "Sign in" link, sign-up, back in the tool at "0 of 5", one more generation.

## Not done yet

- Email verification and password reset: they need an email provider (for example Resend's
  free tier) and a sending domain. Until then a mistyped email is a lost account.
- Google sign-in: needs an OAuth client in Google Cloud.
- Guest history is not moved to the account on sign-up.
- Stripe Checkout, webhooks and the Customer Portal set `pro` (next step, its own ADR).

## Consequences

- Production needs `BETTER_AUTH_SECRET`; `APP_URL` is the auth base URL.
- Migration `accounts` adds `user`, `session`, `account`, `verification` and
  `Generation.userId` (nullable, set null if the account is deleted).
- `GENERATION_LIMIT_PER_VISITOR` is gone; per-person limits come from the plan.

# ADR 0012: Product analytics and the paywall trial experiment

- Status: accepted; the experiment runs once PostHog is configured
- Date: 2026-10-09

## Context

ADR 0010 and 0011 built a funnel (landing → tool → limit → sign-up → paywall → checkout →
paid), but nothing measured it. Two needs:

- **Funnel analytics:** where people drop off, per step and per page type.
- **One controlled experiment** on the paywall: does a 7-day free trial bring more paying
  customers than paying from day one? A trial usually raises checkout starts; whether it raises
  *paid* conversion is the open question, and the reason to test it instead of assuming.

Constraints: landing pages are static and on a JavaScript budget (ADR 0002, Lighthouse CI);
no paid tools.

## Decision

**PostHog** (EU Cloud, free tier: 1M events a month) for events, funnels, feature flags and
experiment analysis, used **from the server**.

| Option | For | Against |
| --- | --- | --- |
| **PostHog via `posthog-node` (server) + our own page-view beacon** | No analytics library on landing pages; events recorded where they really happen; the browser cannot fake funnel events | No autocapture, no session replay |
| PostHog JS on every page | Autocapture, replay, heatmaps | Tens of KB of JavaScript on every landing page, against the budget; cookies and consent banner |
| Vercel Analytics | No code | Page views only, no funnels or experiments on the free tier |
| Own tables + SQL | Full control | Funnels, experiment statistics and dashboards to build by hand |

### Events

| Event | Recorded in | Distinct id |
| --- | --- | --- |
| `page_viewed` | `/api/events`, from a beacon in `PageViews` | visitor cookie |
| `generation_requested`, `limit_reached` | `/api/generations`, `/api/uploads` | user, else visitor |
| `generation_completed`, `generation_failed` | worker | user, else visitor |
| `signed_up`, `signed_in` | auth route, after Better Auth answers 200 | user (visitor aliased to it) |
| `paywall_viewed` | `/api/account?paywall=1` (account page only) | user |
| `checkout_started` | `/api/billing/checkout` | user |
| `subscription_started`, `subscription_status_changed`, `subscription_cancel_requested` | Stripe webhook | user |

- Events go out with `after()`: after the response, never slowing or failing a request.
  `track()` never throws; a unit test runs it with a broken `after` to prove it.
- `/api/events` accepts only `page_viewed`, drops bots and our e2e runs, and is limited per
  IP. Payment events can only come from the signed Stripe webhook.
- Guests are identified by the random visitor cookie; on sign-up or sign-in the visitor id is
  aliased to the user id, so the funnel before and after the account is one person.
- GeoIP is off (the server's IP would be wrong); only the referring host is sent, not the full
  referrer URL.

### The experiment

| | |
| --- | --- |
| Flag | `paywall-trial` (PostHog multivariate flag): `control` 50%, `trial` 50% |
| Who | signed-in Free users who **never had a subscription**, when the account page shows the offer |
| Control | "Pro is $9 a month" → Checkout charges now |
| Trial | "7 days free, then $9 a month" → Checkout with `trial_period_days: 7`, card collected up front |
| Assignment | server-side, `getFeatureFlag(flag, userId)`: a hash of the user id, so the same person gets the same arm on every device and in both the offer and the checkout |
| Exposure | the flag call records `$feature_flag_called`; only eligible users are asked, so former subscribers are never counted as exposed |
| Primary metric | paid conversion: exposed users whose subscription reaches `active` (control: at checkout; trial: `trialing → active` at the first charge) |
| Secondary | `checkout_started` rate |
| Guardrail | `subscription_cancel_requested` within the first period |

Checks before reading a result:

- **Sample size first**, from the baseline rate and the smallest lift worth acting on; stop at
  that size, not when the result first looks significant (peeking inflates false positives).
- **Sample ratio mismatch:** exposures should split about 50/50. A skewed split means
  assignment or logging is broken, and the result is not to be trusted.
- The trial arm's primary metric is only known 7 days after its last exposure.

Honest limit: this project has almost no traffic, so the experiment demonstrates the setup,
not a business result. With a few percent baseline conversion, detecting a 20% relative lift
takes thousands of exposed users per arm.

## Verified

- Unit tests: no-op without a key; `track` never throws; flag value → arm, with control as the
  fallback on errors and unknown values; former subscribers are never asked for an arm; trial
  conversion and cancellation requests are derived from the webhook's `previous_attributes`.
- Writing the worker instrumentation, a unit test caught a tracking call inside the job's
  `try` block turning a finished job into a retry when the analytics code threw. Tracking moved
  to after the job is saved and `track` was made non-throwing.
- Live, against PostHog EU and Stripe test mode: the flag returned `trial` 21 and `control` 19
  for 40 ids, the same arm every time for the same id. A script walked people through landing →
  tool → two generations → limit → sign-up → account until both arms had a paying customer:
  control saw "Pro is $9 a month" and paid $9 at checkout; trial saw "7 days free, then $9" and
  Checkout showed "7 days free", with the first charge 7 days later. Ending that trial through
  the Stripe API moved it `trialing → active`. No analytics errors in the server log.
- `getFeatureFlag` is deprecated in posthog-node 5.50; `evaluateFlags` + `getFlag` replaces it.
  `getFlag` queues the exposure event, so `paywallVariant` flushes the queue after the response:
  a frozen serverless function would otherwise drop exposures and undercount both arms.
- The live run found a bug from ADR 0010: limit errors carry the plan
  (`limit_global:anonymous`), and the tool compared with `=== "limit_global"`, so the site-wide
  limit showed "Generation failed" instead of "the site daily limit is reached". Fixed, and four
  e2e tests now stub the API in the browser to pin every limit message and its next step; the
  old comparison fails the new test.
- The e2e suite (six tests, including Stripe Checkout) passes with PostHog off: everyone is in
  control and nothing else changes.
- `/api/account` no longer waits on Stripe for the tool's quota line: the price and the
  experiment arm are fetched only when the account page shows the offer. Found as a flaky e2e
  run on a cold server.

## Consequences

- Production needs `POSTHOG_KEY` (project API key, `phc_…`) and `POSTHOG_HOST`; without them
  analytics is off and everyone is in control.
- PostHog setup: a multivariate feature flag `paywall-trial` with variants `control` and
  `trial` at 50/50, then an experiment on that flag with the metrics above.
- The landing pages gain one small client component that sends one beacon per page view.

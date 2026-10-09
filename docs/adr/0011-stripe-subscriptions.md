# ADR 0011: Stripe subscriptions, webhooks and the Pro plan

- Status: accepted (test mode)
- Date: 2026-10-09

## Context

ADR 0010 added accounts and plans (guest 2, Free 5, Pro 30 generations a day) and left "how
does someone become Pro" open. Requirements:

- Card data never touches our servers (PCI scope stays minimal).
- Knowing the plan must not depend on Stripe being reachable: every API call that checks a
  limit would otherwise wait on, or fail with, Stripe.
- Webhooks are delivered at least once, can arrive out of order and can be forged by anyone who
  knows the URL.
- No paid infrastructure; test mode until there is something to sell.

## Decision

**Stripe Checkout** (hosted payment page) for the purchase, **Customer Portal** for card
changes, invoices and cancellation, **webhooks** to keep a local copy of each subscription.

```
account → POST /api/billing/checkout ──► Checkout Session (customer, price by lookup key,
                                          subscription_data.metadata.userId)
person pays on checkout.stripe.com
Stripe ──► POST /api/stripe/webhook   ──► verify signature → skip if event seen →
                                          retrieve subscription from Stripe → upsert row
account polls GET /api/account        ──► plan = planFor(user, subscription row) = pro
account → POST /api/billing/portal    ──► portal session → cancel → webhook → row updated
```

### Webhook handling

1. **Signature.** `constructEventAsync(rawBody, stripe-signature, STRIPE_WEBHOOK_SECRET)`.
   The raw body is read as text: re-serialised JSON would not match the signature. Without
   this check anyone could POST "subscription active" and get Pro.
2. **Idempotency.** Event ids are stored in `StripeEvent` after successful processing; a
   repeat is acknowledged with 200 and skipped. A failure answers 500 and is not recorded, so
   Stripe retries (with backoff, for up to three days).
3. **Order independence.** Handlers never trust the event payload. They retrieve the
   subscription from Stripe and write its current state. Whether `updated` arrives before
   `created`, or one event is delivered twice, the row ends up as Stripe has it now. Two
   concurrent deliveries both write the same state, so the race is harmless.
4. **Few events.** `checkout.session.completed` and `customer.subscription.created / updated /
   deleted / paused / resumed`. Payment success or failure is reflected in the subscription's
   status (`active`, `past_due`, `unpaid`), so invoice events add nothing yet.

### What counts as Pro (`planFor`, a pure function)

| Status | Plan | Why |
| --- | --- | --- |
| `active`, `trialing` | Pro | paid or in trial |
| `past_due` | Pro | Stripe is retrying the card (Smart Retries); do not cut access mid-month |
| `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused` | Free | |

Plus a safety net: Pro ends three days after `currentPeriodEnd` whatever the stored status, in
case a cancellation webhook is lost. Cancelling in the portal sets `cancel_at_period_end`: the
person keeps Pro until the period ends, and the account page says so.

### Other choices

- **Price by lookup key** (`restyle_pro_monthly`), not a price id in env vars: one variable
  less, and the price can be replaced in Stripe without a deploy. `pnpm stripe:setup` creates
  the product, price and portal configuration idempotently, per Stripe mode.
- **One customer per user**, created on first checkout with idempotency key `customer:<userId>`,
  so a double click does not create two customers.
- **No second subscription:** checkout answers 409 for someone already on Pro.
- **`userId` in subscription metadata**, so the webhook finds the user even before
  `stripeCustomerId` is stored; the customer id is the fallback.
- **The redirect proves nothing.** `success_url` only shows "payment received, activating";
  the page polls `/api/account` until the webhook has made the person Pro.
- **Stripe's own billing plugin for Better Auth** would have done most of this. Written by hand
  on purpose, to own the webhook semantics; switching later is possible because features only
  see entitlements.

## Verified

- Playwright against Stripe test mode: sign up → "Upgrade to Pro" → Checkout with card 4242 →
  `checkout.session.completed` and `customer.subscription.created` both 200 → account shows
  Pro, "Next payment on …", "0 of 30" → portal → cancel → `customer.subscription.updated` →
  "Subscription cancelled: Pro until …". About 30 s.
- Unit tests with real signatures (`generateTestHeaderString`): wrong secret, tampered body and
  missing signature → 400; duplicate event skipped; processing failure → 500 and not recorded;
  the subscription is re-read instead of trusting the payload; status and period rules. Two
  mutations (recording the event before processing, dropping the period check) are caught.
- Found while testing: Playwright's extra `X-Forwarded-For` header also went to Stripe's own
  API calls from the portal page and failed their CORS preflight, so the portal never loaded.
  The billing test does not send it.

## Not done yet

- Live mode: needs a Stripe account able to accept payments in a supported country, tax
  settings (Stripe Tax) and real prices.
- Dunning emails, proration between plans, annual price, trials: Stripe settings plus a
  status or two, no new architecture.
- Refunds and disputes are handled in the Stripe dashboard.

## Consequences

- Production needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (from a webhook endpoint
  in the Stripe dashboard pointing at `/api/stripe/webhook`, with the six events above).
  Without the key billing is off: the Pro offer is hidden and the billing endpoints answer 503.
- Migration `billing` adds `Subscription`, `StripeEvent` and `user.stripeCustomerId`.
- CI has no Stripe keys; the billing e2e test is skipped there and runs locally with
  `stripe listen`.

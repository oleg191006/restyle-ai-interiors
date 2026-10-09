import "server-only";
import { prisma } from "@restyle/db";
import { cacheLife } from "next/cache";
import Stripe from "stripe";
import { PRO_LOOKUP_KEY } from "./billing-config";
import { env } from "./env";

// Stripe is the source of truth for subscriptions; the Subscription table is a local copy kept
// in sync by webhooks (ADR 0011), so knowing the plan never waits on a Stripe call.

let client: Stripe | undefined;
export const stripe = () => (client ??= new Stripe(env("STRIPE_SECRET_KEY")));

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

export type ProPrice = { id: string; amount: number; currency: string; interval: string };

/** The Pro price, found by lookup key. Cached: it changes only when we change the price. */
export async function proPrice(): Promise<ProPrice> {
  "use cache";
  cacheLife("hours");
  const { data } = await stripe().prices.list({ lookup_keys: [PRO_LOOKUP_KEY], active: true });
  const price = data[0];
  if (!price) throw new Error(`No active Stripe price with lookup key ${PRO_LOOKUP_KEY}; run pnpm stripe:setup`);
  return { id: price.id, amount: price.unit_amount ?? 0, currency: price.currency, interval: price.recurring?.interval ?? "month" };
}

/**
 * The person's Stripe customer, created once. The idempotency key makes a double click (two
 * checkout requests at once) create one customer, not two.
 */
export async function customerFor(user: { id: string; email: string }) {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  if (row?.stripeCustomerId) return row.stripeCustomerId;
  const customer = await stripe().customers.create(
    { email: user.email, metadata: { userId: user.id } },
    { idempotencyKey: `customer:${user.id}` },
  );
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/**
 * Copy one subscription from Stripe into the database. Always retrieves the current object
 * instead of trusting the event payload: webhooks can arrive late, twice or out of order, and
 * "write what Stripe says now" gives the same result whatever the order.
 */
export async function syncSubscription(id: string) {
  const sub = await stripe().subscriptions.retrieve(id);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId =
    sub.metadata.userId ??
    (await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } }))?.id;
  if (!userId) throw new Error(`Subscription ${id} belongs to no known user`);

  // Since API version 2025-03-31 the billing period lives on the subscription item.
  const item = sub.items.data[0];
  const data = {
    userId,
    status: sub.status,
    priceId: item.price.id,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
  };
  await prisma.subscription.upsert({ where: { id: sub.id }, create: { id: sub.id, ...data }, update: data });
}

/** Events we act on. Everything else is acknowledged and ignored. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        await syncSubscription(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
      }
      return true;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      return true;
    default:
      return false;
  }
}

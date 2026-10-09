// One-time Stripe setup (ADR 0011), safe to re-run: finds or creates the Pro product and its
// monthly price, and a Customer Portal configuration.
//
//   pnpm --filter web stripe:setup
//
// The app finds the price by lookup key, so no price id needs to be copied into env vars.
// Run it once per Stripe mode (test, later live) with that mode's secret key.

import Stripe from "stripe";
import { PRO_LOOKUP_KEY } from "../src/lib/billing-config.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
const stripe = new Stripe(key);
console.log(`mode: ${key.startsWith("sk_live_") ? "LIVE" : "test"}`);

const existing = await stripe.prices.list({ lookup_keys: [PRO_LOOKUP_KEY], expand: ["data.product"] });
let price = existing.data[0];
if (price) {
  console.log(`price exists: ${price.id}`);
} else {
  const product = await stripe.products.create({
    name: "Restyle Pro",
    description: "30 AI room redesigns a day",
  });
  price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: 900,
    recurring: { interval: "month" },
    lookup_key: PRO_LOOKUP_KEY,
  });
  console.log(`created product ${product.id} and price ${price.id}`);
}
console.log(`Pro: ${(price.unit_amount ?? 0) / 100} ${price.currency.toUpperCase()} / ${price.recurring?.interval}`);

// The portal lets people update their card, see invoices and cancel at the end of the period,
// so none of that needs our own UI.
const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
const portal =
  configs.data.find((c) => c.is_default) ??
  (await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Restyle: manage your subscription" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      customer_update: { enabled: true, allowed_updates: ["email"] },
    },
  }));
console.log(`portal configuration: ${portal.id}${portal.is_default ? " (default)" : ""}`);

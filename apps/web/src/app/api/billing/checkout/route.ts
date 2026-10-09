import { billingEnabled, customerFor, proPrice, stripe } from "@/lib/billing";
import { env } from "@/lib/env";
import { hasLocale } from "@/lib/i18n";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { requester } from "@/lib/requester";

/**
 * Start a Pro subscription in Stripe Checkout (ADR 0011). Stripe hosts the payment page, so card
 * data never touches our servers. The plan changes only when the webhook arrives, not here.
 */
export async function POST(request: Request) {
  if (!billingEnabled()) return Response.json({ error: "billing_disabled" }, { status: 503 });
  const limited = await rateLimit(request, "billing", [{ max: 10, seconds: 60 }]);
  if (limited) return tooManyRequests(limited);

  const who = await requester();
  if (!who.user) return Response.json({ error: "sign_in_required" }, { status: 401 });
  // A second subscription would bill twice for the same thing.
  if (who.plan === "pro") return Response.json({ error: "already_pro" }, { status: 409 });

  const { locale } = ((await request.json().catch(() => ({}))) ?? {}) as { locale?: string };
  const l = locale && hasLocale(locale) ? locale : "uk";
  const [customer, price] = await Promise.all([customerFor(who.user), proPrice()]);

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: who.user.id,
    // Lets the webhook find the user even before the customer id is stored.
    subscription_data: { metadata: { userId: who.user.id } },
    allow_promotion_codes: true,
    success_url: `${env("APP_URL")}/${l}/account?checkout=success`,
    cancel_url: `${env("APP_URL")}/${l}/account`,
  });
  return Response.json({ url: session.url });
}

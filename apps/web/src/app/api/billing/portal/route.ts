import { prisma } from "@restyle/db";
import { billingEnabled, stripe } from "@/lib/billing";
import { env } from "@/lib/env";
import { hasLocale } from "@/lib/i18n";
import { requester } from "@/lib/requester";

/** Stripe Customer Portal: card, invoices and cancellation without any UI of our own (ADR 0011). */
export async function POST(request: Request) {
  if (!billingEnabled()) return Response.json({ error: "billing_disabled" }, { status: 503 });
  const who = await requester();
  if (!who.user) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const row = await prisma.user.findUnique({ where: { id: who.user.id }, select: { stripeCustomerId: true } });
  if (!row?.stripeCustomerId) return Response.json({ error: "no_customer" }, { status: 404 });

  const { locale } = ((await request.json().catch(() => ({}))) ?? {}) as { locale?: string };
  const l = locale && hasLocale(locale) ? locale : "uk";
  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${env("APP_URL")}/${l}/account`,
  });
  return Response.json({ url: session.url });
}

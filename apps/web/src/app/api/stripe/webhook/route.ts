import { prisma } from "@restyle/db";
import { handleStripeEvent, stripe } from "@/lib/billing";
import { env } from "@/lib/env";

/**
 * Stripe → us (ADR 0011). The signature proves the request came from Stripe; anyone can POST
 * here otherwise and grant themselves Pro. Status codes drive Stripe's retries like QStash's:
 * 2xx = done, anything else = retry with backoff for up to three days.
 */
export async function POST(request: Request) {
  // The signature is over the exact bytes, so read the raw body, never parsed JSON.
  const body = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, request.headers.get("stripe-signature") ?? "", env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  // At-least-once delivery: an event already processed is acknowledged and skipped.
  if (await prisma.stripeEvent.findUnique({ where: { id: event.id } })) return new Response("duplicate", { status: 200 });

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error(`stripe event ${event.id} (${event.type}) failed`, e);
    return new Response("retry", { status: 500 });
  }

  // Recorded only after success, so a failure is retried. Two concurrent deliveries can both
  // get here; processing is idempotent (it writes Stripe's current state), so the second
  // insert failing on the primary key is harmless.
  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } }).catch(() => {});
  return new Response("ok", { status: 200 });
}

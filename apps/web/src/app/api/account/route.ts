import { billingEnabled, proPrice } from "@/lib/billing";
import { entitlementsFor, plans } from "@/lib/entitlements";
import { usedToday } from "@/lib/limits";
import { requester } from "@/lib/requester";

/**
 * Who am I and how much is left today. Pages stay static (ADR 0001), so the account page and
 * the tool ask this endpoint from the browser instead of reading the session while rendering.
 */
export async function GET() {
  const who = await requester();
  const [used, price] = await Promise.all([usedToday(who), billingEnabled() ? proPrice().catch(() => null) : null]);
  return Response.json(
    {
      email: who.user?.email ?? null,
      plan: who.plan,
      used,
      limit: entitlementsFor(who.plan).generationsPerDay,
      subscription: who.subscription && {
        status: who.subscription.status,
        periodEnd: who.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: who.subscription.cancelAtPeriodEnd,
      },
      // What upgrading gives, for the offer; null when billing is not configured.
      pro: price && { ...price, generationsPerDay: plans.pro.generationsPerDay },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

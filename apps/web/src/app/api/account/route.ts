import { track } from "@/lib/analytics";
import { billingEnabled, paywallOffer, proPrice } from "@/lib/billing";
import { entitlementsFor, plans } from "@/lib/entitlements";
import { usedToday } from "@/lib/limits";
import { requester } from "@/lib/requester";

/**
 * Who am I and how much is left today. Pages stay static (ADR 0001), so the account page and
 * the tool ask this endpoint from the browser instead of reading the session while rendering.
 */
export async function GET(request: Request) {
  const who = await requester();
  // `?paywall=1` comes from the account page, where the offer is shown. The tool asks only for
  // its quota, so it neither asks PostHog for an arm nor counts as a paywall view.
  const showsOffer = new URL(request.url).searchParams.has("paywall") && who.user !== null && who.plan === "free" && billingEnabled();
  // Stripe and PostHog are asked only when the offer is shown: the tool's quota line must not
  // wait on another service's network round trip.
  const [used, price, offer] = await Promise.all([
    usedToday(who),
    showsOffer ? proPrice().catch(() => null) : null,
    showsOffer ? paywallOffer(who.user!.id) : null,
  ]);
  if (offer && price) track(who.user!.id, "paywall_viewed", { variant: offer.variant, trialDays: offer.trialDays });
  return Response.json(
    {
      email: who.user?.email ?? null,
      billing: billingEnabled(),
      plan: who.plan,
      used,
      limit: entitlementsFor(who.plan).generationsPerDay,
      subscription: who.subscription && {
        status: who.subscription.status,
        periodEnd: who.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: who.subscription.cancelAtPeriodEnd,
      },
      // What upgrading gives; null unless the account page asked for the offer and billing is on.
      pro: price && { ...price, generationsPerDay: plans.pro.generationsPerDay, trialDays: offer?.trialDays ?? 0 },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

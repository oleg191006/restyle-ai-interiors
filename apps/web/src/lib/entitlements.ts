/**
 * What each plan may do (ADR 0010). Code asks "what is this person entitled to", never "did
 * they pay", so plans and prices can change without touching the features.
 */
export type Plan = "anonymous" | "free" | "pro";

export type Entitlements = {
  generationsPerDay: number;
};

export const plans: Record<Plan, Entitlements> = {
  anonymous: { generationsPerDay: 2 },
  free: { generationsPerDay: 5 },
  pro: { generationsPerDay: 30 },
};

export const entitlementsFor = (plan: Plan) => plans[plan];

export type SubscriptionState = { status: string; currentPeriodEnd: Date };

// A safety net for a missed cancellation webhook: access never outlives the paid period by more
// than this, whatever the stored status says.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Pure, so it is tested without a database or Stripe: a signed-in user whose subscription is in
 * a Pro status (billing-config.ts) and whose period has not ended is Pro; other users are Free.
 */
export function planFor(
  user: { id: string } | null,
  subscription: SubscriptionState | null,
  proStatuses: readonly string[],
  now = Date.now(),
): Plan {
  if (!user) return "anonymous";
  if (subscription && proStatuses.includes(subscription.status) && subscription.currentPeriodEnd.getTime() + GRACE_MS > now) return "pro";
  return "free";
}

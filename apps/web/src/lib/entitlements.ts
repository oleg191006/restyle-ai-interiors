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

/** Signed-in users are on Free until a subscription says otherwise (Stripe, next step). */
export const planFor = (user: { id: string } | null): Plan => (user ? "free" : "anonymous");

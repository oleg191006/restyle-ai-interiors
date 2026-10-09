import "server-only";
import { prisma } from "@restyle/db";
import { headers } from "next/headers";
import { auth, type SessionUser } from "./auth";
import { PRO_STATUSES } from "./billing-config";
import { planFor, type Plan, type SubscriptionState } from "./entitlements";
import { visitorId } from "./visitor";

export type Requester = {
  visitorId: string;
  user: SessionUser | null;
  plan: Plan;
  subscription: (SubscriptionState & { cancelAtPeriodEnd: boolean }) | null;
};

/** The latest subscription; an ended one still tells the account page what happened. */
function latestSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: [{ currentPeriodEnd: "desc" }],
    select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });
}

/**
 * Who is calling an API route: the anonymous visitor cookie, the account if signed in, and the
 * plan. The plan comes from our copy of the subscription, never from a live Stripe call.
 */
export async function requester(): Promise<Requester> {
  const [visitor, session] = await Promise.all([visitorId(), auth.api.getSession({ headers: await headers() })]);
  const user = session ? { id: session.user.id, email: session.user.email } : null;
  const subscription = user ? await latestSubscription(user.id) : null;
  return { visitorId: visitor, user, plan: planFor(user, subscription, PRO_STATUSES), subscription };
}

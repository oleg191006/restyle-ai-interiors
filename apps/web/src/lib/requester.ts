import "server-only";
import { headers } from "next/headers";
import { auth, type SessionUser } from "./auth";
import { planFor, type Plan } from "./entitlements";
import { visitorId } from "./visitor";

export type Requester = { visitorId: string; user: SessionUser | null; plan: Plan };

/** Who is calling an API route: the anonymous visitor cookie, the account if signed in, the plan. */
export async function requester(): Promise<Requester> {
  const [visitor, session] = await Promise.all([visitorId(), auth.api.getSession({ headers: await headers() })]);
  const user = session ? { id: session.user.id, email: session.user.email } : null;
  return { visitorId: visitor, user, plan: planFor(user) };
}

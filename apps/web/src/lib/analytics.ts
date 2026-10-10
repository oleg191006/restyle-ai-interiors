import "server-only";
import { after } from "next/server";
import { PostHog } from "posthog-node";
import { PAYWALL_FLAG, type PaywallVariant } from "./billing-config";

// Product analytics (ADR 0012). Events are sent from the server, where they actually happen,
// so landing pages load no analytics library at all. Without POSTHOG_KEY everything is a no-op.

/** The funnel, in order. A closed list: a typo becomes a type error, not a silent new event. */
export type FunnelEvent =
  | "page_viewed"
  | "generation_requested"
  | "generation_completed"
  | "generation_failed"
  | "generation_rated"
  | "limit_reached"
  | "signed_up"
  | "signed_in"
  | "paywall_viewed"
  | "checkout_started"
  | "subscription_started"
  | "subscription_status_changed"
  | "subscription_cancel_requested";

let client: PostHog | null | undefined;
function posthog() {
  if (client === undefined) {
    const key = process.env.POSTHOG_KEY;
    client = key
      ? new PostHog(key, {
          host: process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
          // Serverless: a function may freeze right after the response, so nothing is batched.
          flushAt: 1,
          flushInterval: 0,
          // The server's IP says nothing about the visitor; no location is better than a wrong one.
          disableGeoip: true,
        })
      : null;
  }
  return client;
}

export const analyticsEnabled = () => Boolean(process.env.POSTHOG_KEY);

/**
 * Record an event after the response is sent (`after`), so analytics never slows a request
 * down and a PostHog outage never breaks one.
 */
export function track(distinctId: string, event: FunnelEvent, properties: Record<string, unknown> = {}) {
  // Never throws: a broken analytics call must not turn a finished job or a payment into an error.
  try {
    const ph = posthog();
    if (!ph) return;
    after(() => ph.captureImmediate({ distinctId, event, properties }).catch((e) => console.error("analytics", e)));
  } catch (e) {
    console.error("analytics", e);
  }
}

/** On sign-up or sign-in: the guest's earlier events (visitor cookie) join the account's person. */
export function linkVisitor(visitorId: string, userId: string) {
  try {
    const ph = posthog();
    if (!ph) return;
    after(() => ph.aliasImmediate({ distinctId: userId, alias: visitorId }).catch((e) => console.error("analytics", e)));
  } catch (e) {
    console.error("analytics", e);
  }
}

/**
 * The paywall experiment arm for a signed-in user, assigned by PostHog from the user id, so the
 * same person always sees the same arm on every device. Asking also records the exposure
 * (`$feature_flag_called`) that the experiment analysis counts. Falls back to control.
 */
export async function paywallVariant(userId: string): Promise<PaywallVariant> {
  const ph = posthog();
  if (!ph) return "control";
  try {
    const flags = await ph.evaluateFlags(userId, { flagKeys: [PAYWALL_FLAG] });
    const variant = flags.getFlag(PAYWALL_FLAG) === "trial" ? "trial" : "control";
    // getFlag queues the exposure event; flush it after the response, or a frozen serverless
    // function loses it and the experiment undercounts who saw which arm.
    after(() => ph.flush().catch((e) => console.error("analytics", e)));
    return variant;
  } catch {
    return "control";
  }
}

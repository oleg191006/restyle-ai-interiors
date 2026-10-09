// Shared between the app and scripts/stripe-setup.ts, so no imports.

/** The Pro price is found by this lookup key, not by a price id copied into env vars. */
export const PRO_LOOKUP_KEY = "restyle_pro_monthly";

/**
 * Subscription statuses that grant Pro (ADR 0011). `past_due` keeps access while Stripe retries
 * the card (Smart Retries), so a failed renewal does not cut someone off mid-month; once retries
 * are exhausted the status becomes `unpaid` or `canceled` and access ends.
 */
export const PRO_STATUSES = ["active", "trialing", "past_due"];

/** PostHog feature flag of the paywall experiment (ADR 0012): `control` or `trial`. */
export const PAYWALL_FLAG = "paywall-trial";
export type PaywallVariant = "control" | "trial";

/** Free days before the first charge in the `trial` arm. One trial per account. */
export const TRIAL_DAYS = 7;

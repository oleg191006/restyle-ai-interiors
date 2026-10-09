import type { Plan } from "./entitlements";
import type { Dictionary } from "./i18n";

/** Shape of GET /api/account, shared by the account page and the tool (browser side). */
export type Account = {
  email: string | null;
  billing: boolean;
  plan: Plan;
  used: number;
  limit: number;
  subscription: { status: string; periodEnd: string; cancelAtPeriodEnd: boolean } | null;
  pro: { amount: number; currency: string; interval: string; generationsPerDay: number; trialDays: number } | null;
};

export const fetchAccount = (opts: { paywall?: boolean } = {}): Promise<Account> =>
  fetch(opts.paywall ? "/api/account?paywall=1" : "/api/account", { cache: "no-store" }).then((r) => r.json());

export const usageText = (t: Dictionary, a: Pick<Account, "used" | "limit">) =>
  t.usage.replace("{used}", String(a.used)).replace("{limit}", String(a.limit));

export const formatPrice = (locale: string, p: { amount: number; currency: string }) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: p.currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(
    p.amount / 100,
  );

export const formatDate = (locale: string, iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long" });

/** POST to a billing endpoint and go to the Stripe page it returns. */
export async function goToStripe(path: "checkout" | "portal", locale: string) {
  const res = await fetch(`/api/billing/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? "billing_failed");
  window.location.assign(json.url);
}

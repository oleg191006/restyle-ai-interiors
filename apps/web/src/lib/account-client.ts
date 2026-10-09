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

/**
 * Better Auth's REST endpoints (sign-in/email, sign-up/email, sign-out) with plain fetch: its
 * client library would add JavaScript the account page does not need. True when it succeeded.
 */
export async function authRequest(path: string, body: unknown = {}) {
  const res = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

/** Only same-site paths, so ?next= cannot send someone to another site after sign-in. */
export const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export const fetchAccount = (opts: { paywall?: boolean } = {}): Promise<Account> =>
  fetch(opts.paywall ? "/api/account?paywall=1" : "/api/account", { cache: "no-store" }).then((r) => r.json());

/** One finished redesign from GET /api/account/generations; the image URLs live for an hour. */
export type HistoryItem = { id: string; createdAt: string; room: string; style: string; before: string; after: string };

export const fetchHistory = (): Promise<HistoryItem[]> =>
  fetch("/api/account/generations", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { items: [] }))
    .then((j) => j.items);

/**
 * Save an image under a readable name. The file is on another origin (R2), where the `download`
 * attribute is ignored, so it is fetched into a blob first; if that fails, it opens in a tab.
 */
export async function downloadImage(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

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

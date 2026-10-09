"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CompareSlider } from "@/components/compare-slider";
import {
  downloadImage,
  fetchAccount,
  fetchHistory,
  formatDate,
  formatPrice,
  goToStripe,
  usageText,
  type Account,
  type HistoryItem,
} from "@/lib/account-client";
import type { Plan } from "@/lib/entitlements";
import { fill, paths, type Dictionary, type Locale } from "@/lib/i18n";

// Better Auth's REST endpoints are called with plain fetch: its client library would add
// JavaScript this page does not need.
async function post(path: string, body: unknown) {
  const res = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

/** Only same-site paths, so ?next= cannot send someone to another site after sign-in. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

type Names = { rooms: Record<string, string>; styles: Record<string, string> };

/** Same footprint as the signed-out layout, so the page does not jump when the session arrives. */
export function AccountSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="h-96 rounded-3xl bg-line/50 motion-safe:animate-pulse" />
      <div className="hidden h-96 rounded-3xl bg-line/30 lg:block" />
    </div>
  );
}

export function AccountPanel({
  t,
  locale,
  names,
  limits,
}: {
  t: Dictionary;
  locale: Locale;
  names: Names;
  limits: Record<Plan, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // Back from Stripe Checkout. The plan changes when the webhook arrives, usually within a
  // second or two, so the page polls until it sees Pro instead of trusting the redirect.
  const [activating, setActivating] = useState(params.get("checkout") === "success");
  const [account, setAccount] = useState<Account | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchAccount({ paywall: true }).then(setAccount);
  useEffect(() => {
    fetchAccount({ paywall: true }).then(setAccount);
  }, []);

  const email = account?.email;
  useEffect(() => {
    if (email) fetchHistory().then(setHistory);
  }, [email]);

  useEffect(() => {
    if (!activating) return;
    let tries = 0;
    const timer = setInterval(async () => {
      const a = await fetchAccount({ paywall: true });
      setAccount(a);
      if (a.plan === "pro" || ++tries >= 15) {
        clearInterval(timer);
        setActivating(false);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [activating]);

  async function billing(path: "checkout" | "portal") {
    setBusy(true);
    setError(null);
    try {
      await goToStripe(path, locale);
    } catch {
      setBusy(false);
      setError(t.billingError);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    const ok =
      mode === "signIn"
        ? await post("sign-in/email", { email, password })
        : await post("sign-up/email", { email, password, name: email.split("@")[0] });
    setBusy(false);
    if (!ok) return setError(mode === "signIn" ? t.authErrorSignIn : t.authErrorSignUp);
    if (next) return router.push(next);
    await load();
  }

  async function signOut() {
    await post("sign-out", {});
    setHistory(null);
    await load();
  }

  if (!account) return <AccountSkeleton />;

  const planName = { anonymous: t.planAnonymous, free: t.planFree, pro: t.planPro }[account.plan];

  if (account.email) {
    const sub = account.subscription;
    const subText =
      account.plan === "pro" && sub
        ? sub.status === "past_due"
          ? t.proPastDue
          : (sub.cancelAtPeriodEnd ? t.proEnds : t.proRenews).replace("{date}", formatDate(locale, sub.periodEnd))
        : null;
    const share = Math.min(100, Math.round((account.used / Math.max(1, account.limit)) * 100));
    return (
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="space-y-6 rounded-3xl border border-line bg-surface p-6">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-display flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent uppercase"
              >
                {account.email[0]}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">{account.email}</p>
                <p className="text-sm text-muted">
                  {t.plan}:{" "}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${account.plan === "pro" ? "bg-accent text-on-accent" : "bg-accent-soft text-foreground"}`}
                  >
                    {planName}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm">{usageText(t, account)}</p>
              {/* Decorative: the sentence above says the same for screen readers. */}
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
              </div>
              {subText && <p className="pt-1 text-sm text-muted">{subText}</p>}
            </div>

            {account.plan === "pro" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => billing("portal")}
                className="min-h-11 w-full rounded-full border border-line-strong px-6 font-semibold hover:border-foreground disabled:opacity-50"
              >
                {t.manageBilling}
              </button>
            )}
            {activating && (
              <p aria-live="polite" className="text-sm">
                {t.checkoutPending}
              </p>
            )}
            {error && (
              <p aria-live="polite" className="text-sm text-accent">
                {error}
              </p>
            )}
            <button type="button" onClick={signOut} className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
              {t.signOut}
            </button>
          </section>

          {account.plan !== "pro" && !activating && account.pro && (
            <section className="space-y-4 rounded-3xl bg-inverse p-6 text-inverse-foreground">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-display text-2xl font-semibold">{t.planPro}</span>
                <span>
                  <span className="font-display text-2xl font-semibold">{formatPrice(locale, account.pro)}</span>{" "}
                  <span className="text-sm text-inverse-muted">{t.perMonth}</span>
                </span>
              </p>
              <p className="text-sm text-inverse-muted">
                {fill(account.pro.trialDays > 0 ? t.proPitchTrial : t.proPitch, {
                  price: formatPrice(locale, account.pro),
                  count: account.pro.generationsPerDay,
                  days: account.pro.trialDays,
                })}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => billing("checkout")}
                className="min-h-12 w-full rounded-full bg-accent px-6 py-3 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
              >
                {account.pro.trialDays > 0 ? fill(t.startTrial, { days: account.pro.trialDays }) : t.upgrade}
              </button>
            </section>
          )}
        </aside>

        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-3xl font-semibold">{t.historyTitle}</h2>
            <p className="text-sm text-muted">{t.historyNote}</p>
          </div>
          {history === null ? (
            <div aria-hidden className="grid gap-6 sm:grid-cols-2">
              <div className="aspect-4/3 rounded-2xl bg-line/50 motion-safe:animate-pulse" />
              <div className="aspect-4/3 rounded-2xl bg-line/50 motion-safe:animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-line-strong px-6 py-14 text-center">
              <p className="font-display text-2xl font-semibold">{t.historyEmptyTitle}</p>
              <p className="max-w-sm text-muted">{t.historyEmptyText}</p>
              <Link href={paths.redesign(locale)} className="rounded-full bg-accent px-6 py-3 font-semibold text-on-accent hover:bg-accent-hover">
                {t.ctaShort}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {history.map((h) => {
                const room = names.rooms[h.room] ?? h.room;
                const style = names.styles[h.style] ?? h.style;
                return (
                  <li key={h.id} className="space-y-3">
                    <CompareSlider
                      label={t.compareLabel}
                      beforeLabel={t.toolBefore}
                      afterLabel={t.toolAfter}
                      // eslint-disable-next-line @next/next/no-img-element -- a short-lived storage URL
                      before={<img src={h.before} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      // eslint-disable-next-line @next/next/no-img-element
                      after={<img src={h.after} alt={`${room} · ${style}`} loading="lazy" className="h-full w-full object-cover" />}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {room} · {style}
                        </p>
                        <p className="text-sm text-muted">{formatDate(locale, h.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => downloadImage(h.after, `restyle-${h.room}-${h.style}.jpg`)}
                          className="min-h-10 rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
                        >
                          {t.toolDownload}
                        </button>
                        <Link
                          href={paths.redesign(locale, h.room)}
                          className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold hover:border-foreground"
                        >
                          {t.historyAgain}
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const benefits = [
    fill(t.authBenefitLimit, { count: limits.free, guest: limits.anonymous }),
    t.authBenefitHistory,
    t.authBenefitDevices,
    fill(t.authBenefitPro, { count: limits.pro }),
  ];
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">{mode === "signIn" ? t.signIn : t.signUp}</h2>
          <label className="flex flex-col gap-2">
            <span className="font-medium">{t.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-12 rounded-xl border border-line-strong bg-background px-4 py-3 focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">{t.password}</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="min-h-12 rounded-xl border border-line-strong bg-background px-4 py-3 focus:border-accent focus:outline-none"
            />
            {mode === "signUp" && <span className="text-sm text-muted">{t.passwordHint}</span>}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-full bg-accent px-6 py-3 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            {mode === "signIn" ? t.signIn : t.signUp}
          </button>
          <p aria-live="polite" className="text-sm text-accent empty:hidden">
            {error}
          </p>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
          className="px-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          {mode === "signIn" ? t.toSignUp : t.toSignIn}
        </button>
      </div>

      <aside className="space-y-6 rounded-3xl bg-accent-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{t.authBenefitsTitle}</h2>
        <ul className="space-y-4">
          {benefits.map((b) => (
            <li key={b} className="flex gap-3">
              <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-accent">
                <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line-strong pt-4 text-sm text-muted">
          {t.plan}: {planName} · {usageText(t, account)}
        </p>
      </aside>
    </div>
  );
}

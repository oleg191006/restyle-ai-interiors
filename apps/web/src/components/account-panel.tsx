"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAccount, formatDate, formatPrice, goToStripe, usageText, type Account } from "@/lib/account-client";
import type { Dictionary, Locale } from "@/lib/i18n";

// Better Auth's REST endpoints are called with plain fetch: its client library would add
// JavaScript this page does not need.
async function post(path: string, body: unknown) {
  const res = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

/** Only same-site paths, so ?next= cannot send someone to another site after sign-in. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export function AccountPanel({ t, locale }: { t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // Back from Stripe Checkout. The plan changes when the webhook arrives, usually within a
  // second or two, so the page polls until it sees Pro instead of trusting the redirect.
  const [activating, setActivating] = useState(params.get("checkout") === "success");
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchAccount({ paywall: true }).then(setAccount);
  useEffect(() => {
    fetchAccount({ paywall: true }).then(setAccount);
  }, []);

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
    await load();
  }

  if (!account) return <p className="text-muted">…</p>;

  const planName = { anonymous: t.planAnonymous, free: t.planFree, pro: t.planPro }[account.plan];

  if (account.email) {
    const sub = account.subscription;
    const subText =
      account.plan === "pro" && sub
        ? sub.status === "past_due"
          ? t.proPastDue
          : (sub.cancelAtPeriodEnd ? t.proEnds : t.proRenews).replace("{date}", formatDate(locale, sub.periodEnd))
        : null;
    return (
      <div className="max-w-md space-y-4 rounded-xl border border-line p-6">
        <p className="font-medium">{account.email}</p>
        <p>
          {t.plan}: <strong>{planName}</strong>
        </p>
        <p className="text-muted">{usageText(t, account)}</p>
        {subText && <p className="text-sm">{subText}</p>}

        {account.plan === "pro" ? (
          <button type="button" disabled={busy} onClick={() => billing("portal")} className="w-full rounded-full border border-line px-6 py-3 hover:border-accent disabled:opacity-50">
            {t.manageBilling}
          </button>
        ) : activating ? (
          <p aria-live="polite" className="text-sm">
            {t.checkoutPending}
          </p>
        ) : (
          account.pro && (
            <div className="space-y-3 rounded-lg bg-line/40 p-4">
              <p className="text-sm">
                {(account.pro.trialDays > 0 ? t.proPitchTrial : t.proPitch)
                  .replace("{price}", formatPrice(locale, account.pro))
                  .replace("{count}", String(account.pro.generationsPerDay))
                  .replace("{days}", String(account.pro.trialDays))}
              </p>
              <button type="button" disabled={busy} onClick={() => billing("checkout")} className="w-full rounded-full bg-accent px-6 py-3 font-medium text-background disabled:opacity-50">
                {account.pro.trialDays > 0 ? t.startTrial.replace("{days}", String(account.pro.trialDays)) : t.upgrade}
              </button>
            </div>
          )
        )}
        <p aria-live="polite" className="text-sm text-muted">
          {error}
        </p>
        <button type="button" onClick={signOut} className="text-sm text-muted hover:text-foreground">
          {t.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <p className="text-muted">
        {t.plan}: {planName} · {usageText(t, account)}
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line p-6">
        <label className="flex flex-col gap-2">
          <span className="font-medium">{t.email}</span>
          <input name="email" type="email" required autoComplete="email" className="rounded-xl border border-line bg-background p-3" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">{t.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            className="rounded-xl border border-line bg-background p-3"
          />
          {mode === "signUp" && <span className="text-sm text-muted">{t.passwordHint}</span>}
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-full bg-accent px-6 py-3 font-medium text-background disabled:opacity-50">
          {mode === "signIn" ? t.signIn : t.signUp}
        </button>
        <p aria-live="polite" className="text-sm text-muted">
          {error}
        </p>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
        className="text-sm text-accent hover:underline"
      >
        {mode === "signIn" ? t.toSignUp : t.toSignIn}
      </button>
    </div>
  );
}

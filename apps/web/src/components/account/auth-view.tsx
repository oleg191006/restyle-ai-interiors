import { useState } from "react";
import { button } from "@/components/ui/button";
import { authRequest, usageText, type Account } from "@/lib/account-client";
import type { Plan } from "@/lib/entitlements";
import { fill, type Dictionary } from "@/lib/i18n";

const input = "min-h-12 rounded-xl border border-line-strong bg-background px-4 py-3 focus:border-accent focus:outline-none";

/** Signed out: the sign-in / sign-up form next to what an account gives. */
export function AuthView({
  t,
  account,
  limits,
  onSignedIn,
}: {
  t: Dictionary;
  account: Account;
  limits: Record<Plan, number>;
  onSignedIn: () => void;
}) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planName = { anonymous: t.planAnonymous, free: t.planFree, pro: t.planPro }[account.plan];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    const ok =
      mode === "signIn"
        ? await authRequest("sign-in/email", { email, password })
        : await authRequest("sign-up/email", { email, password, name: email.split("@")[0] });
    setBusy(false);
    if (ok) onSignedIn();
    else setError(mode === "signIn" ? t.authErrorSignIn : t.authErrorSignUp);
  }

  function switchMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setError(null);
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
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">{t.password}</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className={input}
            />
            {mode === "signUp" && <span className="text-sm text-muted">{t.passwordHint}</span>}
          </label>
          <button type="submit" disabled={busy} className={button("primary", "lg", "w-full")}>
            {mode === "signIn" ? t.signIn : t.signUp}
          </button>
          <p aria-live="polite" className="text-sm text-accent empty:hidden">
            {error}
          </p>
        </form>
        <button type="button" onClick={switchMode} className="px-2 text-sm font-semibold text-accent underline-offset-4 hover:underline">
          {mode === "signIn" ? t.toSignUp : t.toSignIn}
        </button>
      </div>

      <aside className="space-y-6 rounded-3xl bg-accent-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{t.authBenefitsTitle}</h2>
        <ul className="space-y-4">
          {benefits.map((b) => (
            <li key={b} className="flex gap-3">
              <CheckIcon />
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

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-accent">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

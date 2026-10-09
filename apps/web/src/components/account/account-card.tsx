import { button } from "@/components/ui/button";
import { formatDate, usageText, type Account } from "@/lib/account-client";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Who is signed in, the plan, today's usage and the subscription state. */
export function AccountCard({
  t,
  locale,
  account,
  busy,
  error,
  activating,
  onManage,
  onSignOut,
}: {
  t: Dictionary;
  locale: Locale;
  account: Account & { email: string };
  busy: boolean;
  error: string | null;
  activating: boolean;
  onManage: () => void;
  onSignOut: () => void;
}) {
  const pro = account.plan === "pro";
  const planName = pro ? t.planPro : t.planFree;
  const share = Math.min(100, Math.round((account.used / Math.max(1, account.limit)) * 100));

  return (
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
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pro ? "bg-accent text-on-accent" : "bg-accent-soft text-foreground"}`}>
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
        {pro && <SubscriptionLine t={t} locale={locale} subscription={account.subscription} />}
      </div>

      {pro && (
        <button type="button" disabled={busy} onClick={onManage} className={button("outline", "md", "w-full")}>
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
      <button type="button" onClick={onSignOut} className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
        {t.signOut}
      </button>
    </section>
  );
}

/** "Next payment on…", "Pro until…" or "payment failed" for a Pro subscription. */
function SubscriptionLine({ t, locale, subscription }: { t: Dictionary; locale: Locale; subscription: Account["subscription"] }) {
  if (!subscription) return null;
  const text =
    subscription.status === "past_due"
      ? t.proPastDue
      : (subscription.cancelAtPeriodEnd ? t.proEnds : t.proRenews).replace("{date}", formatDate(locale, subscription.periodEnd));
  return <p className="pt-1 text-sm text-muted">{text}</p>;
}

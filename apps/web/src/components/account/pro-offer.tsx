import { button } from "@/components/ui/button";
import { formatPrice, type Account } from "@/lib/account-client";
import { fill, type Dictionary, type Locale } from "@/lib/i18n";

/** The Pro offer for a Free account; the trial wording depends on the paywall experiment arm (ADR 0012). */
export function ProOffer({
  t,
  locale,
  offer,
  busy,
  onUpgrade,
}: {
  t: Dictionary;
  locale: Locale;
  offer: NonNullable<Account["pro"]>;
  busy: boolean;
  onUpgrade: () => void;
}) {
  const price = formatPrice(locale, offer);
  const trial = offer.trialDays > 0;
  return (
    <section className="space-y-4 rounded-3xl bg-inverse p-6 text-inverse-foreground">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-display text-2xl font-semibold">{t.planPro}</span>
        <span>
          <span className="font-display text-2xl font-semibold">{price}</span> <span className="text-sm text-inverse-muted">{t.perMonth}</span>
        </span>
      </p>
      <p className="text-sm text-inverse-muted">
        {fill(trial ? t.proPitchTrial : t.proPitch, { price, count: offer.generationsPerDay, days: offer.trialDays })}
      </p>
      <button type="button" disabled={busy} onClick={onUpgrade} className={button("primary", "lg", "w-full")}>
        {trial ? fill(t.startTrial, { days: offer.trialDays }) : t.upgrade}
      </button>
    </section>
  );
}

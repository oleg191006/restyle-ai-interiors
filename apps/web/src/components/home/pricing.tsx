import Link from "next/link";
import { button } from "@/components/ui/button";
import { formatPrice } from "@/lib/account-client";
import type { ProPrice } from "@/lib/billing";
import { plans } from "@/lib/entitlements";
import { fill, paths, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * The three plans. Limits come from lib/entitlements.ts, the Pro price from Stripe; without
 * Stripe (CI, local) the Pro card shows no price.
 */
export function Pricing({ t, locale, price }: { t: Dictionary; locale: Locale; price: ProPrice | null }) {
  const free = formatPrice(locale, { amount: 0, currency: price?.currency ?? "usd" });
  return (
    <section id="pricing" className="below-fold scroll-mt-20 bg-inverse text-inverse-foreground">
      <div className="container-page space-y-10 py-16 sm:py-20">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.pricingTitle}</h2>
          <p className="text-lg text-inverse-muted">{t.pricingLead}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <PlanCard name={t.planAnonymous} price={free} text={fill(t.planGuestText, { count: plans.anonymous.generationsPerDay })} />
          <PlanCard name={t.planFree} price={free} text={fill(t.planFreeText, { count: plans.free.generationsPerDay })} />
          <div className="flex flex-col gap-3 rounded-2xl bg-background p-7 text-foreground">
            <span className="text-sm font-semibold tracking-widest text-accent uppercase">{t.planPro}</span>
            {price && (
              <span className="font-display text-4xl font-semibold">
                {formatPrice(locale, price)} <span className="font-sans text-lg font-normal text-muted">{t.perMonth}</span>
              </span>
            )}
            <span className="text-muted">{fill(t.planProText, { count: plans.pro.generationsPerDay })}</span>
            <Link href={paths.account(locale)} className={button("primary", "lg", "mt-2 self-start")}>
              {t.upgrade}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ name, price, text }: { name: string; price: string; text: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-inverse-line p-7">
      <span className="text-sm tracking-widest text-inverse-muted uppercase">{name}</span>
      <span className="font-display text-4xl font-semibold">{price}</span>
      <span className="text-inverse-muted">{text}</span>
    </div>
  );
}

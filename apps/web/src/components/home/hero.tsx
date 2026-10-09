import Link from "next/link";
import { CompareSlider } from "@/components/compare-slider";
import { button, textLink } from "@/components/ui/button";
import { HeroImage } from "@/components/ui/hero-image";
import { plans } from "@/lib/entitlements";
import type { Example } from "@/lib/examples";
import { fill, paths, type Dictionary, type Locale } from "@/lib/i18n";

/** First screen: the promise and the call to action beside a real before/after pair. */
export function Hero({ t, locale, styleCount, example, styleName }: { t: Dictionary; locale: Locale; styleCount: number; example: Example | null; styleName?: string }) {
  return (
    <section className="container-page grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:py-20">
      <div className="space-y-5 sm:space-y-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase sm:text-sm">{t.heroEyebrow}</p>
        <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">{t.heroTitle}</h1>
        <p className="max-w-md text-lg text-muted sm:text-xl">{fill(t.heroText, { count: styleCount })}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link href={paths.redesign(locale)} className={button("primary", "xl")}>
            {t.heroUpload}
          </Link>
          <Link href="#styles" className={`px-1 py-2 ${textLink}`}>
            {t.heroExamples}
          </Link>
        </div>
        <p className="text-sm text-muted">{fill(t.heroTrust, { count: plans.anonymous.generationsPerDay })}</p>
      </div>

      {example && styleName && (
        <figure className="space-y-3">
          <CompareSlider
            label={t.compareLabel}
            beforeLabel={t.toolBefore}
            afterLabel={fill(t.afterIn, { style: styleName })}
            className="shadow-[0_30px_60px_-30px_rgb(30_26_22/0.45)]"
            before={<HeroImage src={example.before} alt={t.exampleBeforeAlt} lcp />}
            after={<HeroImage src={example.after} alt={`${styleName}: ${t.exampleTitle}`} />}
          />
          <figcaption className="text-sm text-muted">{t.heroCaption}</figcaption>
        </figure>
      )}
    </section>
  );
}

import Link from "next/link";
import { CompareSlider } from "@/components/compare-slider";
import { button } from "@/components/ui/button";
import { HeroImage } from "@/components/ui/hero-image";
import type { Example } from "@/lib/examples";
import type { Dictionary } from "@/lib/i18n";

/** Title and call to action; beside them the before/after slider when an example is published. */
export function IdeaHero({
  t,
  title,
  lead,
  toolHref,
  example,
  beforeAlt,
  afterAlt,
}: {
  t: Dictionary;
  title: string;
  lead: string;
  toolHref: string;
  example: Example | null;
  beforeAlt: string;
  afterAlt: string;
}) {
  return (
    <section className={`grid items-center gap-10 ${example ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14" : ""}`}>
      <header className="space-y-5">
        <h1 className="font-display max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="max-w-2xl text-lg text-muted">{lead}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={toolHref} className={button("primary", "lg")}>
            {t.cta}
          </Link>
          <span className="text-sm text-muted">{t.ctaHint}</span>
        </div>
      </header>

      {example && (
        <figure className="space-y-3" aria-label={t.exampleTitle}>
          <CompareSlider
            label={t.compareLabel}
            beforeLabel={t.toolBefore}
            afterLabel={t.toolAfter}
            before={<HeroImage src={example.before} alt={beforeAlt} lcp />}
            after={<HeroImage src={example.after} alt={afterAlt} />}
          />
          <figcaption className="text-sm text-muted">{t.exampleNote}</figcaption>
        </figure>
      )}
    </section>
  );
}

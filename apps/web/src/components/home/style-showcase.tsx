import Image from "next/image";
import Link from "next/link";
import { NearViewport } from "@/components/near-viewport";
import { textLink } from "@/components/ui/button";
import { Swatches } from "@/components/ui/swatches";
import { paths, type Dictionary, type Locale } from "@/lib/i18n";

export type ShowcaseItem = { slug: string; name: string; palette: string[]; image: string };

/**
 * "One room, many characters": the same room in each style that has an example. Below the
 * fold, so photos mount only near the viewport (NearViewport, ADR 0013).
 */
export function StyleShowcase({ t, locale, room, items }: { t: Dictionary; locale: Locale; room: { slug: string; name: string }; items: ShowcaseItem[] }) {
  if (items.length === 0) return null;
  return (
    <section id="styles" className="below-fold container-page scroll-mt-20 space-y-8 pt-16 pb-8 sm:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.showcaseTitle}</h2>
          <p className="text-lg text-muted">{t.showcaseLead}</p>
        </div>
        <Link href={paths.styles(locale)} className={textLink}>
          {t.allStyles}
        </Link>
      </div>
      {/* Phones: a swipeable row instead of six full-width photos; wider screens: a grid. */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <Link href={paths.idea(locale, room.slug, s.slug)} className="group block space-y-3">
              <div className="aspect-4/3 overflow-hidden rounded-2xl bg-line">
                <NearViewport>
                  <Image
                    src={s.image}
                    alt={`${room.name}: ${s.name}`}
                    width={1024}
                    height={768}
                    sizes="(min-width: 1200px) 384px, (min-width: 640px) 50vw, 78vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </NearViewport>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-xl font-semibold group-hover:text-accent">{s.name}</span>
                <Swatches colors={s.palette} size="sm" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

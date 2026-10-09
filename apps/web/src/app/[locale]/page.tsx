import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareSlider } from "@/components/compare-slider";
import { NearViewport } from "@/components/near-viewport";
import { formatPrice } from "@/lib/account-client";
import { billingEnabled, proPrice } from "@/lib/billing";
import { getRooms, getStyles } from "@/lib/data";
import { plans } from "@/lib/entitlements";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, fill, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    description: t.heroLead,
    alternates: alternatesFor(locale, paths.home),
  };
}

const HERO = { room: "living-room", style: "japandi" };
const SHOWCASE_ROOM = "living-room";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles, price] = await Promise.all([
    getRooms(locale),
    getStyles(locale),
    // Cached for hours; without Stripe (CI, local) the Pro card simply shows no price.
    billingEnabled() ? proPrice().catch(() => null) : null,
  ]);

  const hero = exampleFor(HERO.room, HERO.style);
  const heroStyle = styles.find((s) => s.slug === HERO.style);
  const showcase = styles
    .map((s) => ({ ...s, example: exampleFor(SHOWCASE_ROOM, s.slug) }))
    .filter((s) => s.example)
    .slice(0, 6);
  // Each room's picture: its highest-priority style that has a published example.
  const roomCards = rooms.map((r) => ({ ...r, image: styles.map((s) => exampleFor(r.slug, s.slug)).find(Boolean)?.after }));
  const pictured = roomCards.filter((r) => r.image).slice(0, 3);
  const others = roomCards.filter((r) => !pictured.includes(r));

  const steps = [
    { title: t.step1Title, text: t.step1Text },
    { title: t.step2Title, text: fill(t.step2Text, { count: styles.length }) },
    { title: t.step3Title, text: t.step3Text },
  ];

  return (
    <>
      <section className="container-page grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:py-20">
        <div className="space-y-5 sm:space-y-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase sm:text-sm">{t.heroEyebrow}</p>
          <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">{t.heroTitle}</h1>
          <p className="max-w-md text-lg text-muted sm:text-xl">{fill(t.heroText, { count: styles.length })}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link
              href={paths.redesign(locale)}
              className="rounded-full bg-accent px-7 py-4 text-lg font-semibold text-on-accent hover:bg-accent-hover"
            >
              {t.heroUpload}
            </Link>
            <Link href="#styles" className="border-b border-foreground px-1 py-2 font-semibold hover:border-accent hover:text-accent">
              {t.heroExamples}
            </Link>
          </div>
          <p className="text-sm text-muted">{fill(t.heroTrust, { count: plans.anonymous.generationsPerDay })}</p>
        </div>

        {hero && heroStyle && (
          <figure className="space-y-3">
            <CompareSlider
              label={t.compareLabel}
              beforeLabel={t.toolBefore}
              afterLabel={fill(t.afterIn, { style: heroStyle.name })}
              className="shadow-[0_30px_60px_-30px_rgb(30_26_22/0.45)]"
              before={<HeroImage src={hero.before} alt={t.exampleBeforeAlt} lcp />}
              after={<HeroImage src={hero.after} alt={`${heroStyle.name}: ${t.exampleTitle}`} />}
            />
            <figcaption className="text-sm text-muted">{t.heroCaption}</figcaption>
          </figure>
        )}
      </section>

      <section className="border-y border-line bg-surface">
        <ol className="container-page grid gap-8 py-12 sm:grid-cols-3 sm:gap-10 sm:py-16">
          {steps.map((s, i) => (
            <li key={s.title} className="space-y-2">
              <span className="font-display text-4xl leading-none text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {showcase.length > 0 && (
        <section id="styles" className="below-fold container-page scroll-mt-20 space-y-8 pt-16 pb-8 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.showcaseTitle}</h2>
              <p className="text-lg text-muted">{t.showcaseLead}</p>
            </div>
            <Link href={paths.styles(locale)} className="border-b border-foreground font-semibold hover:border-accent hover:text-accent">
              {t.allStyles}
            </Link>
          </div>
          {/* Phones: a swipeable row instead of six full-width photos; wider screens: a grid. */}
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {showcase.map((s) => (
              <li key={s.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <Link href={paths.idea(locale, SHOWCASE_ROOM, s.slug)} className="group block space-y-3">
                  <div className="aspect-4/3 overflow-hidden rounded-2xl bg-line">
                    <NearViewport>
                      <Image
                        src={s.example!.after}
                        alt={`${rooms.find((r) => r.slug === SHOWCASE_ROOM)?.name}: ${s.name}`}
                        width={1024}
                        height={768}
                        sizes="(min-width: 1200px) 384px, (min-width: 640px) 50vw, 78vw"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </NearViewport>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-xl font-semibold group-hover:text-accent">{s.name}</span>
                    <span aria-hidden className="flex gap-1">
                      {s.palette.map((c) => (
                        <span key={c} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="below-fold container-page space-y-8 pt-12 pb-16 sm:pb-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.roomsTitle}</h2>
        <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {pictured.map((r) => (
            <li key={r.slug}>
              <Link href={paths.room(locale, r.slug)} className="group relative block aspect-16/10 overflow-hidden rounded-2xl sm:aspect-4/5">
                <span className="absolute inset-0 bg-line">
                  <NearViewport>
                    <Image
                      src={r.image!}
                      alt={`${r.name}: ${t.exampleTitle}`}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </NearViewport>
                </span>
                <span className="absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/75 to-transparent px-5 pt-16 pb-5 text-white">
                  <span className="font-display text-2xl font-semibold sm:text-3xl">{r.name}</span>
                  <span className="text-sm opacity-90">{fill(t.roomStyles, { count: styles.length })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-2.5">
          {others.map((r) => (
            <li key={r.slug}>
              <Link
                href={paths.room(locale, r.slug)}
                className="inline-block rounded-full border border-line-strong bg-surface px-4 py-2.5 hover:border-foreground"
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="pricing" className="below-fold scroll-mt-20 bg-inverse text-inverse-foreground">
        <div className="container-page space-y-10 py-16 sm:py-20">
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.pricingTitle}</h2>
            <p className="text-lg text-inverse-muted">{t.pricingLead}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <PlanCard name={t.planAnonymous} price={formatPrice(locale, { amount: 0, currency: price?.currency ?? "usd" })} text={fill(t.planGuestText, { count: plans.anonymous.generationsPerDay })} />
            <PlanCard name={t.planFree} price={formatPrice(locale, { amount: 0, currency: price?.currency ?? "usd" })} text={fill(t.planFreeText, { count: plans.free.generationsPerDay })} />
            <div className="flex flex-col gap-3 rounded-2xl bg-background p-7 text-foreground">
              <span className="text-sm font-semibold tracking-widest text-accent uppercase">{t.planPro}</span>
              {price && (
                <span className="font-display text-4xl font-semibold">
                  {formatPrice(locale, price)} <span className="font-sans text-lg font-normal text-muted">{t.perMonth}</span>
                </span>
              )}
              <span className="text-muted">{fill(t.planProText, { count: plans.pro.generationsPerDay })}</span>
              <Link
                href={paths.account(locale)}
                className="mt-2 self-start rounded-full bg-accent px-5 py-3 font-semibold text-on-accent hover:bg-accent-hover"
              >
                {t.upgrade}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * First screen. The bottom layer ("before") is the LCP element: it is preloaded with high
 * priority. The top layer loads eagerly at normal priority, so the two do not compete.
 */
function HeroImage({ src, alt, lcp = false }: { src: string; alt: string; lcp?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1024}
      height={768}
      sizes="(min-width: 1200px) 640px, (min-width: 1024px) 54vw, 100vw"
      quality={60}
      preload={lcp}
      fetchPriority={lcp ? "high" : "auto"}
      loading="eager"
      className="h-full w-full object-cover"
    />
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

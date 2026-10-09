import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompareSlider } from "@/components/compare-slider";
import { JsonLd } from "@/components/json-ld";
import { NearViewport } from "@/components/near-viewport";
import { getIdeaPage, getRoom, getRooms, getStyle, getStyles, getTopIdeaParams } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, fill, getDictionary, hasLocale, paths } from "@/lib/i18n";

type Props = PageProps<"/[locale]/ideas/[room]/[style]">;

// Prerender the head of the demand curve; the long tail renders on first visit (ADR 0001).
export async function generateStaticParams() {
  return getTopIdeaParams(40);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, room, style } = await params;
  if (!hasLocale(locale)) return {};
  const page = await getIdeaPage(locale, room, style);
  if (!page) return {};
  return {
    title: page.title,
    description: page.lead,
    alternates: alternatesFor(locale, (l) => paths.idea(l, room, style)),
    openGraph: { title: page.title, description: page.lead, type: "article" },
  };
}

export default async function IdeaPage({ params }: Props) {
  const { locale, room: roomSlug, style: styleSlug } = await params;
  if (!hasLocale(locale)) notFound();

  const [page, room, style, rooms, styles] = await Promise.all([
    getIdeaPage(locale, roomSlug, styleSlug),
    getRoom(locale, roomSlug),
    getStyle(locale, styleSlug),
    getRooms(locale),
    getStyles(locale),
  ]);
  if (!page || !room || !style) notFound();
  const t = getDictionary(locale);
  const example = exampleFor(roomSlug, styleSlug);
  const afterAlt =
    locale === "uk" ? `${room.name} у стилі «${style.name}» — AI-редизайн` : `${style.name} ${room.name.toLowerCase()} — AI redesign`;

  const otherStyles = styles.filter((s) => s.slug !== styleSlug).slice(0, 8);

  return (
    <article>
      <div className="container-page space-y-8 pt-8 pb-14 sm:pt-10 sm:pb-20">
        <Breadcrumbs
          items={[
            { name: t.home, href: paths.home(locale) },
            { name: t.ideas, href: paths.ideas(locale) },
            { name: room.name, href: paths.room(locale, roomSlug) },
            { name: style.name, href: paths.idea(locale, roomSlug, styleSlug) },
          ]}
        />

        <section className={`grid items-center gap-10 ${example ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14" : ""}`}>
          <header className="space-y-5">
            <h1 className="font-display max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
            <p className="max-w-2xl text-lg text-muted">{page.lead}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={paths.redesign(locale, roomSlug, styleSlug)}
                className="rounded-full bg-accent px-6 py-3.5 font-semibold text-on-accent hover:bg-accent-hover"
              >
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
                before={<HeroImage src={example.before} alt={`${room.name} ${t.exampleBeforeAlt}`} lcp />}
                after={<HeroImage src={example.after} alt={afterAlt} />}
              />
              <figcaption className="text-sm text-muted">{t.exampleNote}</figcaption>
            </figure>
          )}
        </section>
      </div>

      <div className="below-fold container-page space-y-16 pb-16 sm:space-y-20 sm:pb-20">
        <section className="grid gap-5 md:grid-cols-2">
          <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-7">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.palette}</h2>
            <ul aria-label={t.palette} className="grid grid-cols-4 gap-3">
              {style.palette.map((c) => (
                <li key={c} className="space-y-2">
                  <span className="block aspect-square rounded-xl ring-1 ring-black/10" style={{ backgroundColor: c }} />
                  <code className="text-xs text-muted">{c}</code>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-7">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.materials}</h2>
            <ul className="flex flex-wrap gap-2.5">
              {style.materials.map((m) => (
                <li key={m} className="rounded-full bg-accent-soft px-4 py-2">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t.tips}</h2>
          <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {page.tips.map((tip, i) => (
              <li key={tip} className="space-y-2 border-t-2 border-foreground pt-4">
                <span className="font-display block text-3xl leading-none text-accent">{String(i + 1).padStart(2, "0")}</span>
                <p>{tip}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-3xl space-y-2">
          <h2 className="font-display mb-4 text-3xl font-semibold sm:text-4xl">{t.faq}</h2>
          {page.faq.map((f, i) => (
            <details key={f.q} open={i === 0} className="group border-b border-line py-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="text-2xl leading-none text-accent transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pt-2 pb-2 text-muted">{f.a}</p>
            </details>
          ))}
        </section>

        <nav aria-label={t.otherStyles} className="space-y-10">
          <section className="space-y-5">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.otherStyles}</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {otherStyles.map((s) => {
                const ex = exampleFor(roomSlug, s.slug);
                return (
                  <li key={s.slug}>
                    <Link href={paths.idea(locale, roomSlug, s.slug)} className="group block space-y-2">
                      <span className="block aspect-4/3 overflow-hidden rounded-xl bg-line">
                        {ex ? (
                          <NearViewport>
                            <Image
                              src={ex.after}
                              alt=""
                              width={1024}
                              height={768}
                              sizes="(min-width: 640px) 25vw, 50vw"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                          </NearViewport>
                        ) : (
                          <span className="flex h-full items-center justify-center gap-1.5 bg-accent-soft">
                            {s.palette.map((c) => (
                              <span key={c} className="size-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="block font-semibold group-hover:text-accent">{s.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t.otherRooms}</h2>
            <ul className="flex flex-wrap gap-2.5">
              {rooms
                .filter((r) => r.slug !== roomSlug)
                .map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={paths.idea(locale, r.slug, styleSlug)}
                      className="inline-block rounded-full border border-line-strong bg-surface px-4 py-2.5 hover:border-foreground"
                    >
                      {r.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </nav>

        <section className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-inverse p-8 text-inverse-foreground sm:p-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-3xl font-semibold">{t.ctaBandTitle}</h2>
            <p className="text-inverse-muted">{fill(t.ctaBandText, { style: style.name })}</p>
          </div>
          <Link
            href={paths.redesign(locale, roomSlug, styleSlug)}
            className="rounded-full bg-inverse-foreground px-6 py-3.5 font-semibold text-inverse hover:opacity-90"
          >
            {t.heroUpload}
          </Link>
        </section>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </article>
  );
}

/** The slider's bottom layer is the LCP element: preloaded at high priority; the top layer loads eagerly. */
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

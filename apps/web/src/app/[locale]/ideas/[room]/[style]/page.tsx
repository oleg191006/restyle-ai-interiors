import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Palette } from "@/components/palette";
import { getIdeaPage, getRoom, getRooms, getStyle, getStyles, getTopIdeaParams } from "@/lib/data";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

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

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.ideas, href: paths.ideas(locale) },
          { name: room.name, href: paths.room(locale, roomSlug) },
          { name: style.name, href: paths.idea(locale, roomSlug, styleSlug) },
        ]}
      />

      <header className="space-y-4">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{page.title}</h1>
        <p className="max-w-2xl text-lg text-muted">{page.lead}</p>
        <span className="inline-block rounded-full bg-accent px-5 py-3 font-medium text-background">
          {t.cta}
        </span>
      </header>

      <section className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{t.palette}</h2>
          <Palette colors={style.palette} label={t.palette} />
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{t.materials}</h2>
          <ul className="flex flex-wrap gap-2">
            {style.materials.map((m) => (
              <li key={m} className="rounded-full border border-line px-3 py-1 text-sm">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.tips}</h2>
        <ol className="list-decimal space-y-2 pl-5">
          {page.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.faq}</h2>
        <dl className="space-y-4">
          {page.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="grid gap-8 border-t border-line pt-8 sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">{t.otherStyles}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {styles
              .filter((s) => s.slug !== styleSlug)
              .slice(0, 8)
              .map((s) => (
                <li key={s.slug}>
                  <Link href={paths.idea(locale, roomSlug, s.slug)} className="text-accent hover:underline">
                    {s.name}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">{t.otherRooms}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {rooms
              .filter((r) => r.slug !== roomSlug)
              .map((r) => (
                <li key={r.slug}>
                  <Link href={paths.idea(locale, r.slug, styleSlug)} className="text-accent hover:underline">
                    {r.name}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </nav>

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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CtaBand } from "@/components/idea/cta-band";
import { Faq } from "@/components/idea/faq";
import { IdeaHero } from "@/components/idea/idea-hero";
import { RelatedLinks } from "@/components/idea/related-links";
import { StyleDetails } from "@/components/idea/style-details";
import { Tips } from "@/components/idea/tips";
import { getIdeaPage, getRoom, getRooms, getStyle, getStyles, getTopIdeaParams } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

type Props = PageProps<"/[locale]/ideas/[room]/[style]">;

const RELATED_STYLES = 8;

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
  const toolHref = paths.redesign(locale, roomSlug, styleSlug);

  const relatedStyles = styles
    .filter((s) => s.slug !== styleSlug)
    .slice(0, RELATED_STYLES)
    .map((s) => ({ href: paths.idea(locale, roomSlug, s.slug), name: s.name, palette: s.palette, image: exampleFor(roomSlug, s.slug)?.after }));
  const relatedRooms = rooms.filter((r) => r.slug !== roomSlug).map((r) => ({ href: paths.idea(locale, r.slug, styleSlug), label: r.name }));

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
        <IdeaHero
          t={t}
          title={page.title}
          lead={page.lead}
          toolHref={toolHref}
          example={exampleFor(roomSlug, styleSlug)}
          beforeAlt={`${room.name} ${t.exampleBeforeAlt}`}
          afterAlt={locale === "uk" ? `${room.name} у стилі «${style.name}» — AI-редизайн` : `${style.name} ${room.name.toLowerCase()} — AI redesign`}
        />
      </div>

      <div className="below-fold container-page space-y-16 pb-16 sm:space-y-20 sm:pb-20">
        <StyleDetails t={t} palette={style.palette} materials={style.materials} />
        <Tips t={t} tips={page.tips} />
        <Faq t={t} items={page.faq} />
        <RelatedLinks t={t} styles={relatedStyles} rooms={relatedRooms} />
        <CtaBand t={t} styleName={style.name} href={toolHref} />
      </div>
    </article>
  );
}

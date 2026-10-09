import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pricing } from "@/components/home/pricing";
import { RoomGallery } from "@/components/home/room-gallery";
import { StyleShowcase } from "@/components/home/style-showcase";
import { billingEnabled, proPrice } from "@/lib/billing";
import { getRooms, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

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
const SHOWCASE_SIZE = 6;

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

  const showcase = styles.flatMap((s) => {
    const example = exampleFor(SHOWCASE_ROOM, s.slug);
    return example ? [{ slug: s.slug, name: s.name, palette: s.palette, image: example.after }] : [];
  });
  // Each room's picture: its highest-priority style that has a published example.
  const roomItems = rooms.map((r) => ({ slug: r.slug, name: r.name, image: styles.map((s) => exampleFor(r.slug, s.slug)).find(Boolean)?.after }));

  return (
    <>
      <Hero
        t={t}
        locale={locale}
        styleCount={styles.length}
        example={exampleFor(HERO.room, HERO.style)}
        styleName={styles.find((s) => s.slug === HERO.style)?.name}
      />
      <HowItWorks t={t} styleCount={styles.length} />
      <StyleShowcase
        t={t}
        locale={locale}
        room={{ slug: SHOWCASE_ROOM, name: rooms.find((r) => r.slug === SHOWCASE_ROOM)?.name ?? "" }}
        items={showcase.slice(0, SHOWCASE_SIZE)}
      />
      <RoomGallery t={t} locale={locale} rooms={roomItems} styleCount={styles.length} />
      <Pricing t={t} locale={locale} price={price} />
    </>
  );
}

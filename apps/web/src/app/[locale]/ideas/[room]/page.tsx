import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PaletteStrip } from "@/components/palette";
import { getRoom, getRooms, getStyles } from "@/lib/data";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateStaticParams() {
  const rooms = await getRooms("uk");
  return rooms.map((r) => ({ room: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/ideas/[room]">): Promise<Metadata> {
  const { locale, room: slug } = await params;
  if (!hasLocale(locale)) return {};
  const room = await getRoom(locale, slug);
  if (!room) return {};
  const t = getDictionary(locale);
  return {
    title: `${t.ideasFor}: ${room.name}`,
    description: room.intro,
    alternates: alternatesFor(locale, (l) => paths.room(l, slug)),
  };
}

// params are awaited outside Suspense on purpose: unknown slugs must get a real 404,
// not a 200 App Shell that later streams "not found" (soft 404 for crawlers).
export default async function RoomHub({ params }: PageProps<"/[locale]/ideas/[room]">) {
  const { locale, room: slug } = await params;
  if (!hasLocale(locale)) notFound();
  const [room, styles] = await Promise.all([getRoom(locale, slug), getStyles(locale)]);
  if (!room) notFound();
  const t = getDictionary(locale);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: room.name, href: paths.room(locale, slug) },
        ]}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          {t.ideasFor}: {room.name}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{room.intro}</p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {styles.map((s) => (
          <li key={s.slug}>
            <Link
              href={paths.idea(locale, slug, s.slug)}
              className="block space-y-3 rounded-xl border border-line p-4 hover:border-accent"
            >
              <PaletteStrip colors={s.palette} />
              <span className="block font-medium">{s.name}</span>
              <span className="block text-sm text-muted">{s.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExampleThumb } from "@/components/example-thumb";
import { PageHeader } from "@/components/ui/page-header";
import { getRoom, getRooms, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, fill, getDictionary, hasLocale, paths } from "@/lib/i18n";

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
    title: t.roomIdeas.replace("{room}", room.name),
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
    <div className="container-page space-y-8 py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.ideas, href: paths.ideas(locale) },
          { name: room.name, href: paths.room(locale, slug) },
        ]}
      />
      <PageHeader title={fill(t.roomIdeas, { room: room.name })} lead={room.intro} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6">
        {styles.map((s, i) => {
          const example = exampleFor(slug, s.slug);
          return (
            <li key={s.slug}>
              <Link
                href={paths.idea(locale, slug, s.slug)}
                className="group block h-full space-y-3"
              >
                <ExampleThumb
                position={i}
                  src={example?.after}
                  palette={s.palette}
                  alt={`${room.name}: ${s.name}`}
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
                />
                <span className="font-display block text-xl font-semibold group-hover:text-accent">{s.name}</span>
                <span className="block text-sm text-muted">{s.summary}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

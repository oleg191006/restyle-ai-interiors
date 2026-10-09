import Image from "next/image";
import Link from "next/link";
import { NearViewport } from "@/components/near-viewport";
import { ChipLinks } from "@/components/ui/chip-links";
import { fill, paths, type Dictionary, type Locale } from "@/lib/i18n";

export type RoomItem = { slug: string; name: string; image?: string };

const PICTURED = 3;

/** The first rooms with a photo as large cards, the rest as chips. */
export function RoomGallery({ t, locale, rooms, styleCount }: { t: Dictionary; locale: Locale; rooms: RoomItem[]; styleCount: number }) {
  const pictured = rooms.filter((r) => r.image).slice(0, PICTURED);
  const others = rooms.filter((r) => !pictured.includes(r));
  return (
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
                <span className="text-sm opacity-90">{fill(t.roomStyles, { count: styleCount })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ChipLinks links={others.map((r) => ({ href: paths.room(locale, r.slug), label: r.name }))} />
    </section>
  );
}

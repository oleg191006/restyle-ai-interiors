import Image from "next/image";
import Link from "next/link";
import { NearViewport } from "@/components/near-viewport";
import { ChipLinks } from "@/components/ui/chip-links";
import { Swatches } from "@/components/ui/swatches";
import type { Dictionary } from "@/lib/i18n";

export type RelatedStyle = { href: string; name: string; palette: string[]; image?: string };

/**
 * Internal links that keep the landing pages connected (ADR 0004): other styles for this room
 * as picture cards, and this style in other rooms as chips.
 */
export function RelatedLinks({ t, styles, rooms }: { t: Dictionary; styles: RelatedStyle[]; rooms: { href: string; label: string }[] }) {
  return (
    <nav aria-label={t.otherStyles} className="space-y-10">
      <section className="space-y-5">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.otherStyles}</h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {styles.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="group block space-y-2">
                <span className="block aspect-4/3 overflow-hidden rounded-xl bg-line">
                  {s.image ? (
                    <NearViewport>
                      <Image
                        src={s.image}
                        alt=""
                        width={1024}
                        height={768}
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </NearViewport>
                  ) : (
                    <Swatches colors={s.palette} className="h-full justify-center bg-accent-soft" />
                  )}
                </span>
                <span className="block font-semibold group-hover:text-accent">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.otherRooms}</h2>
        <ChipLinks links={rooms} />
      </section>
    </nav>
  );
}

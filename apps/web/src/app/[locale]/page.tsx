import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaletteStrip } from "@/components/palette";
import { getRooms, getStyles } from "@/lib/data";
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

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles] = await Promise.all([getRooms(locale), getStyles(locale)]);

  return (
    <div className="space-y-14">
      <section className="space-y-4">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{t.tagline}</h1>
        <p className="max-w-xl text-lg text-muted">{t.heroLead}</p>
        <span className="inline-block rounded-full bg-accent px-5 py-3 font-medium text-background">
          {t.cta}
        </span>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.rooms}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rooms.map((r) => (
            <li key={r.slug}>
              <Link
                href={paths.room(locale, r.slug)}
                className="block rounded-xl border border-line p-4 hover:border-accent"
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.styles}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {styles.map((s) => (
            <li key={s.slug}>
              <Link
                href={paths.style(locale, s.slug)}
                className="block space-y-3 rounded-xl border border-line p-4 hover:border-accent"
              >
                <PaletteStrip colors={s.palette} />
                <span className="block font-medium">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

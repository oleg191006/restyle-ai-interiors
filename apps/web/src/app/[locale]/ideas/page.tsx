import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExampleThumb } from "@/components/example-thumb";
import { getRooms, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/ideas">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.ideasTitle,
    description: t.ideasLead,
    alternates: alternatesFor(locale, paths.ideas),
  };
}

// Section index: every URL prefix is a real page, so /uk/ideas is not a 404 when
// someone trims a landing page URL, and breadcrumbs mirror the URL path.
export default async function IdeasIndex({ params }: PageProps<"/[locale]/ideas">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles] = await Promise.all([getRooms(locale), getStyles(locale)]);

  return (
    <div className="container-page space-y-8 py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.ideas, href: paths.ideas(locale) },
        ]}
      />
      <header className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t.ideasTitle}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.ideasLead}</p>
      </header>
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <li key={r.slug}>
            <Link href={paths.room(locale, r.slug)} className="group block h-full space-y-3">
              <ExampleThumb
                src={styles.map((s) => exampleFor(r.slug, s.slug)).find(Boolean)?.after}
                alt={r.name}
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              />
              <span className="font-display block text-xl font-semibold group-hover:text-accent">{r.name}</span>
              <span className="block text-muted">{r.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getRooms } from "@/lib/data";
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
  const rooms = await getRooms(locale);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.ideas, href: paths.ideas(locale) },
        ]}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{t.ideasTitle}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.ideasLead}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rooms.map((r) => (
          <li key={r.slug}>
            <Link
              href={paths.room(locale, r.slug)}
              className="block space-y-1 rounded-xl border border-line p-4 hover:border-accent"
            >
              <span className="block font-medium">{r.name}</span>
              <span className="block text-sm text-muted">{r.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

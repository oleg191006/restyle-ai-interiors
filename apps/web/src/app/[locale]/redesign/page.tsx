import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RedesignTool } from "@/components/redesign-tool";
import { getRooms, getStyles } from "@/lib/data";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/redesign">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.toolTitle,
    description: t.toolLead,
    // ?room=&style= only preselect the form; every variant is the same page.
    alternates: alternatesFor(locale, (l) => paths.redesign(l)),
  };
}

// The page itself is static: the room and style come from the query string, which only
// the client component reads, so this route keeps ensureStatic = "navigation".
export default async function RedesignPage({ params }: PageProps<"/[locale]/redesign">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles] = await Promise.all([getRooms(locale), getStyles(locale)]);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.toolTitle, href: paths.redesign(locale) },
        ]}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{t.toolTitle}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.toolLead}</p>
      </header>
      <Suspense>
        <RedesignTool
          locale={locale}
          t={t}
          rooms={rooms.map((r) => ({ slug: r.slug, name: r.name }))}
          styles={styles.map((s) => ({ slug: s.slug, name: s.name }))}
        />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RedesignTool, type StyleOption } from "@/components/redesign-tool";
import { getRooms, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
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

// The page itself is static: the room and style come from the query string, which only the
// client component reads after hydration, so this route keeps ensureStatic = "navigation".
export default async function RedesignPage({ params }: PageProps<"/[locale]/redesign">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles] = await Promise.all([getRooms(locale), getStyles(locale)]);

  const roomOptions = rooms.map((r) => ({ slug: r.slug, name: r.name }));
  // Each style card shows a real example for the chosen room when one is published.
  const styleOptions: StyleOption[] = styles.map((s) => ({
    slug: s.slug,
    name: s.name,
    palette: s.palette,
    examples: Object.fromEntries(rooms.flatMap((r) => (exampleFor(r.slug, s.slug) ? [[r.slug, exampleFor(r.slug, s.slug)!.after]] : []))),
  }));

  return (
    <div className="container-page space-y-8 py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.toolTitle, href: paths.redesign(locale) },
        ]}
      />
      <header className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t.toolTitle}</h1>
        <p className="text-lg text-muted">{t.toolLead}</p>
      </header>
      <RedesignTool locale={locale} t={t} rooms={roomOptions} styles={styleOptions} />
    </div>
  );
}

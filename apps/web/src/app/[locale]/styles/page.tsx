import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PaletteStrip } from "@/components/palette";
import { getStyles } from "@/lib/data";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/styles">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.stylesTitle,
    description: t.stylesLead,
    alternates: alternatesFor(locale, paths.styles),
  };
}

export default async function StylesIndex({ params }: PageProps<"/[locale]/styles">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const styles = await getStyles(locale);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.styles, href: paths.styles(locale) },
        ]}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{t.stylesTitle}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.stylesLead}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {styles.map((s) => (
          <li key={s.slug}>
            <Link
              href={paths.style(locale, s.slug)}
              className="block h-full space-y-3 rounded-xl border border-line p-4 hover:border-accent"
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

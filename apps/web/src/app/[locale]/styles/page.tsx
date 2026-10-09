import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExampleThumb } from "@/components/example-thumb";
import { PageHeader } from "@/components/ui/page-header";
import { getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
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
    <div className="container-page space-y-8 py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.styles, href: paths.styles(locale) },
        ]}
      />
      <PageHeader title={t.stylesTitle} lead={t.stylesLead} />
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {styles.map((s) => (
          <li key={s.slug}>
            <Link href={paths.style(locale, s.slug)} className="group block h-full space-y-3">
              <ExampleThumb
                src={exampleFor("living-room", s.slug)?.after}
                palette={s.palette}
                alt={s.name}
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              />
              <span className="font-display block text-xl font-semibold group-hover:text-accent">{s.name}</span>
              <span className="block text-muted">{s.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

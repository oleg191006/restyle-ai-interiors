import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExampleThumb } from "@/components/example-thumb";
import { PageHeader } from "@/components/ui/page-header";
import { PaletteTiles } from "@/components/ui/swatches";
import { getRooms, getStyle, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { alternatesFor, getDictionary, hasLocale, paths } from "@/lib/i18n";

export async function generateStaticParams() {
  const styles = await getStyles("uk");
  return styles.map((s) => ({ style: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/styles/[style]">): Promise<Metadata> {
  const { locale, style: slug } = await params;
  if (!hasLocale(locale)) return {};
  const style = await getStyle(locale, slug);
  if (!style) return {};
  return {
    title: style.name,
    description: style.summary,
    alternates: alternatesFor(locale, (l) => paths.style(l, slug)),
  };
}

export default async function StyleHub({ params }: PageProps<"/[locale]/styles/[style]">) {
  const { locale, style: slug } = await params;
  if (!hasLocale(locale)) notFound();
  const [style, rooms] = await Promise.all([getStyle(locale, slug), getRooms(locale)]);
  if (!style) notFound();
  const t = getDictionary(locale);

  return (
    <div className="container-page space-y-8 py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.styles, href: paths.styles(locale) },
          { name: style.name, href: paths.style(locale, slug) },
        ]}
      />
      <PageHeader title={style.name} lead={style.summary} />
      <section className="max-w-xl space-y-4">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.palette}</h2>
        <PaletteTiles colors={style.palette} label={t.palette} />
      </section>
      <section className="space-y-5">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.styleIn}</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
          {rooms.map((r, i) => {
            const example = exampleFor(r.slug, slug);
            return (
              <li key={r.slug}>
                <Link
                  href={paths.idea(locale, r.slug, slug)}
                  className="group block h-full space-y-3"
                >
                  <ExampleThumb
                position={i}
                    src={example?.after}
                    palette={style.palette}
                    alt={`${r.name}: ${style.name}`}
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 25vw, 50vw"
                  />
                  <span className="font-display block text-lg font-semibold group-hover:text-accent">{r.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

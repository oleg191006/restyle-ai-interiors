import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExampleThumb } from "@/components/example-thumb";
import { Palette } from "@/components/palette";
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
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { name: t.home, href: paths.home(locale) },
          { name: t.styles, href: paths.styles(locale) },
          { name: style.name, href: paths.style(locale, slug) },
        ]}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{style.name}</h1>
        <p className="max-w-2xl text-lg text-muted">{style.summary}</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.palette}</h2>
        <Palette colors={style.palette} label={t.palette} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t.styleIn}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rooms.map((r) => {
            const example = exampleFor(r.slug, slug);
            return (
              <li key={r.slug}>
                <Link
                  href={paths.idea(locale, r.slug, slug)}
                  className="block space-y-3 rounded-xl border border-line p-4 hover:border-accent"
                >
                  {example && (
                    <ExampleThumb
                      src={example.after}
                      alt={`${r.name}: ${style.name}`}
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 25vw, 50vw"
                    />
                  )}
                  <span className="block">{r.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

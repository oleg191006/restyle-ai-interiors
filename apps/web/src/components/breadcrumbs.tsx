import Link from "next/link";
import { siteUrl } from "@/lib/i18n";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href: string };

/** Visible breadcrumbs plus the matching BreadcrumbList JSON-LD. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          {items.map((c, i) => (
            <li key={c.href} className="flex gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {i === items.length - 1 ? (
                <span aria-current="page">{c.name}</span>
              ) : (
                <Link href={c.href} className="hover:underline">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: new URL(c.href, siteUrl).toString(),
          })),
        }}
      />
    </>
  );
}

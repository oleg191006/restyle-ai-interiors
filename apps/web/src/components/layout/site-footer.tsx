import Link from "next/link";
import { paths, type Dictionary, type Locale } from "@/lib/i18n";
import { otherLocale, siteNav } from "./nav";

/** The same links as the header, all visible, plus the other language by name. */
export function SiteFooter({ t, locale }: { t: Dictionary; locale: Locale }) {
  const other = otherLocale(locale);
  const links = [
    ...siteNav(t, locale),
    { href: paths.account(locale), label: t.account },
  ];
  return (
    <footer className="border-t border-line">
      <div className="container-page flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted">
        <span className="font-display text-xl font-semibold text-foreground">{t.siteName}</span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <Link href={paths.home(other)} hrefLang={other} className="hover:text-foreground">
            {other === "en" ? "English" : "Українська"}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

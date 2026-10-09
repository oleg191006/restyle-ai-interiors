import Link from "next/link";
import { paths, type Dictionary, type Locale } from "@/lib/i18n";
import { otherLocale, siteNav } from "./nav";

/**
 * Plain links, not a session-aware menu: reading the session here would make every page
 * dynamic (ADR 0010). Section links hide on phones, where the CTA and language stay.
 */
export function SiteHeader({ t, locale }: { t: Dictionary; locale: Locale }) {
  const other = otherLocale(locale);
  return (
    <header className="border-b border-line">
      <div className="container-page flex items-center justify-between gap-4 py-3 sm:py-4">
        <Link href={paths.home(locale)} className="font-display text-2xl font-semibold tracking-tight">
          {t.siteName}
        </Link>
        <nav className="flex items-center gap-1 text-[15px] sm:gap-6">
          {siteNav(t, locale).map((n) => (
            <Link key={n.href} href={n.href} className="hidden hover:text-accent md:inline">
              {n.label}
            </Link>
          ))}
          <Link href={paths.account(locale)} className="hidden text-muted hover:text-foreground sm:inline">
            {t.account}
          </Link>
          <Link href={paths.home(other)} hrefLang={other} className="px-2 py-2 text-muted hover:text-foreground">
            {other.toUpperCase()}
          </Link>
          <Link href={paths.redesign(locale)} className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover sm:px-5">
            {t.ctaShort}
          </Link>
        </nav>
      </div>
    </header>
  );
}

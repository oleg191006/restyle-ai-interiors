import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageViews } from "@/components/page-views";
import { WebVitals } from "@/components/web-vitals";
import { getDictionary, hasLocale, locales, paths, siteUrl } from "@/lib/i18n";
import "../globals.css";

// Body text keeps the system font stack: no download. Inter cost ~67 KiB and ~300 ms of
// mobile LCP (docs/adr/0002-web-font.md). Headings use Playfair Display on wide screens only
// (globals.css, --heading-font): phones never reference it, so they never download it, and
// lab LCP stays in budget (it cost ~250 ms there, ADR 0013). Not preloaded, for the same reason;
// "swap" with next/font's metric-matched fallback keeps the swap free of layout shift.
const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: "600",
  display: "swap",
  preload: false,
  variable: "--font-playfair",
});

// Every page is fully static. An unlisted URL waits for its complete render instead of
// getting a 200 App Shell, so notFound() yields a real 404, not a soft 404 (ADR 0001).
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${t.siteName} — ${t.tagline}`, template: `%s | ${t.siteName}` },
    openGraph: { siteName: t.siteName, locale: locale === "uk" ? "uk_UA" : "en_US", type: "website" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const other = locale === "uk" ? "en" : "uk";
  const nav = [
    { href: paths.styles(locale), label: t.navStyles },
    { href: paths.ideas(locale), label: t.navRooms },
    { href: `${paths.home(locale)}#pricing`, label: t.navPricing },
  ];

  return (
    <html lang={locale} className={`h-full antialiased ${display.variable}`}>
      <body className="flex min-h-full flex-col font-sans">
        <WebVitals />
        <PageViews />
        <header className="border-b border-line">
          <div className="container-page flex items-center justify-between gap-4 py-3 sm:py-4">
            <Link href={paths.home(locale)} className="font-display text-2xl font-semibold tracking-tight">
              {t.siteName}
            </Link>
            <nav className="flex items-center gap-1 text-[15px] sm:gap-6">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hidden hover:text-accent md:inline">
                  {n.label}
                </Link>
              ))}
              {/* Plain links, not a session-aware menu: reading the session here would make
                  every page dynamic (ADR 0010). */}
              <Link href={paths.account(locale)} className="hidden text-muted hover:text-foreground sm:inline">
                {t.account}
              </Link>
              <Link href={paths.home(other)} hrefLang={other} className="px-2 py-2 text-muted hover:text-foreground">
                {other.toUpperCase()}
              </Link>
              <Link
                href={paths.redesign(locale)}
                className="rounded-full bg-accent px-4 py-2.5 font-semibold text-on-accent hover:bg-accent-hover sm:px-5"
              >
                {t.ctaShort}
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="container-page flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted">
            <span className="font-display text-xl font-semibold text-foreground">{t.siteName}</span>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-foreground">
                  {n.label}
                </Link>
              ))}
              <Link href={paths.account(locale)} className="hover:text-foreground">
                {t.account}
              </Link>
              <Link href={paths.home(other)} hrefLang={other} className="hover:text-foreground">
                {other === "en" ? "English" : "Українська"}
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

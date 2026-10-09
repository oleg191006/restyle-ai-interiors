import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageViews } from "@/components/page-views";
import { WebVitals } from "@/components/web-vitals";
import { getDictionary, hasLocale, locales, siteUrl } from "@/lib/i18n";
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
  return (
    <html lang={locale} className={`h-full antialiased ${display.variable}`}>
      <body className="flex min-h-full flex-col font-sans">
        <WebVitals />
        <PageViews />
        <SiteHeader t={t} locale={locale} />
        <main className="flex-1">{children}</main>
        <SiteFooter t={t} locale={locale} />
      </body>
    </html>
  );
}

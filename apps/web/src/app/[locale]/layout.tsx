import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WebVitals } from "@/components/web-vitals";
import { getDictionary, hasLocale, locales, paths, siteUrl } from "@/lib/i18n";
import "../globals.css";

// System font stack (Tailwind default): no font download. Inter cost ~67 KiB and
// ~300 ms of mobile LCP in Lighthouse; see docs/adr/0002-web-font.md.

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

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <WebVitals />
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href={paths.home(locale)} className="text-lg font-semibold tracking-tight">
              {t.siteName}
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {/* A plain link, not a session-aware menu: reading the session here would make
                  every page dynamic (ADR 0010). */}
              <Link href={paths.account(locale)} className="text-muted hover:text-foreground">
                {t.account}
              </Link>
              <Link href={paths.home(other)} hrefLang={other} className="text-muted hover:text-foreground">
                {other.toUpperCase()}
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          © {t.siteName}
        </footer>
      </body>
    </html>
  );
}

import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Restyle";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Default image for every page under [locale] that doesn't define its own.
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDictionary(hasLocale(locale) ? locale : "uk");
  return renderOgImage({ eyebrow: t.siteName, title: t.tagline });
}

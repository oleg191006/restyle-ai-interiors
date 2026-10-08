import { getStyle, getStyles } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Restyle";
export const size = ogSize;
export const contentType = ogContentType;

export async function generateStaticParams() {
  const styles = await getStyles("uk");
  return styles.map((s) => ({ style: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ locale: string; style: string }> }) {
  const { locale: raw, style: slug } = await params;
  const locale = hasLocale(raw) ? raw : "uk";
  const t = getDictionary(locale);
  const style = await getStyle(locale, slug);
  return renderOgImage({
    eyebrow: t.styles,
    title: style?.name ?? t.tagline,
    palette: style?.palette,
  });
}

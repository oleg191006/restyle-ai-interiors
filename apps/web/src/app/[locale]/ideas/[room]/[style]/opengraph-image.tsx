import { getIdeaPage, getRoom, getStyle, getTopIdeaParams } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Restyle";
export const size = ogSize;
export const contentType = ogContentType;

// Same split as the page: top combinations at build time, the rest on first request.
export async function generateStaticParams() {
  return getTopIdeaParams(40);
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; room: string; style: string }>;
}) {
  const { locale: raw, room: roomSlug, style: styleSlug } = await params;
  const locale = hasLocale(raw) ? raw : "uk";
  const [page, room, style] = await Promise.all([
    getIdeaPage(locale, roomSlug, styleSlug),
    getRoom(locale, roomSlug),
    getStyle(locale, styleSlug),
  ]);
  if (!page || !room || !style) return renderOgImage({ title: getDictionary(locale).tagline });
  return renderOgImage({ eyebrow: `${room.name} · ${style.name}`, title: page.title, palette: style.palette });
}

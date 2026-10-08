import { getRoom, getRooms } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Restyle";
export const size = ogSize;
export const contentType = ogContentType;

export async function generateStaticParams() {
  const rooms = await getRooms("uk");
  return rooms.map((r) => ({ room: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ locale: string; room: string }> }) {
  const { locale: raw, room: slug } = await params;
  const locale = hasLocale(raw) ? raw : "uk";
  const t = getDictionary(locale);
  const room = await getRoom(locale, slug);
  return renderOgImage({ eyebrow: t.siteName, title: room ? `${t.ideasFor}: ${room.name}` : t.tagline });
}

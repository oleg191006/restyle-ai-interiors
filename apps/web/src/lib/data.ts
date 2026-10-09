import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma, type Locale as DbLocale } from "@restyle/db";
import type { Locale } from "./i18n";

// Every read used by a page is cached and tagged (ADR 0001).
// Content edits call revalidateTag("<entity>:<slug>", "max").

export async function getRooms(locale: Locale) {
  "use cache";
  cacheLife("days");
  cacheTag("rooms");
  const rooms = await prisma.room.findMany({
    orderBy: { priority: "desc" },
    include: { translations: { where: { locale: locale as DbLocale } } },
  });
  return rooms.map((r) => ({ slug: r.slug, priority: r.priority, ...r.translations[0] }));
}

export async function getStyles(locale: Locale) {
  "use cache";
  cacheLife("days");
  cacheTag("styles");
  const styles = await prisma.style.findMany({
    orderBy: { priority: "desc" },
    include: { translations: { where: { locale: locale as DbLocale } } },
  });
  return styles.map((s) => ({
    slug: s.slug,
    priority: s.priority,
    palette: s.palette,
    ...s.translations[0],
  }));
}

export async function getRoom(locale: Locale, slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`room:${slug}`);
  const room = await prisma.room.findUnique({
    where: { slug },
    include: { translations: { where: { locale: locale as DbLocale } } },
  });
  if (!room || !room.translations[0]) return null;
  return { slug: room.slug, ...room.translations[0] };
}

export async function getStyle(locale: Locale, slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`style:${slug}`);
  const style = await prisma.style.findUnique({
    where: { slug },
    include: { translations: { where: { locale: locale as DbLocale } } },
  });
  if (!style || !style.translations[0]) return null;
  return { slug: style.slug, palette: style.palette, ...style.translations[0] };
}

export type Faq = { q: string; a: string }[];

export async function getIdeaPage(locale: Locale, roomSlug: string, styleSlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`room:${roomSlug}`, `style:${styleSlug}`, "pages");
  const page = await prisma.ideaPage.findFirst({
    where: {
      locale: locale as DbLocale,
      published: true,
      room: { slug: roomSlug },
      style: { slug: styleSlug },
    },
  });
  if (!page) return null;
  return {
    title: page.title,
    lead: page.lead,
    tips: page.tips,
    faq: page.faq as Faq,
    updatedAt: page.updatedAt.toISOString(),
  };
}

/** Highest-demand combinations, prerendered at build. The long tail renders on first visit. */
export async function getTopIdeaParams(limit: number) {
  "use cache";
  cacheLife("days");
  cacheTag("pages");
  const [rooms, styles] = await Promise.all([
    prisma.room.findMany({ select: { slug: true, priority: true } }),
    prisma.style.findMany({ select: { slug: true, priority: true } }),
  ]);
  return rooms
    .flatMap((r) => styles.map((s) => ({ room: r.slug, style: s.slug, score: r.priority * s.priority })))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ room, style }) => ({ room, style }));
}

/** All published pages, for the sitemap. */
export async function getAllIdeaPages() {
  "use cache";
  cacheLife("days");
  cacheTag("pages");
  const pages = await prisma.ideaPage.findMany({
    where: { published: true },
    select: { locale: true, updatedAt: true, room: { select: { slug: true } }, style: { select: { slug: true } } },
  });
  return pages.map((p) => ({
    locale: p.locale as Locale,
    room: p.room.slug,
    style: p.style.slug,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export type RoomSummary = Awaited<ReturnType<typeof getRooms>>[number];
export type StyleSummary = Awaited<ReturnType<typeof getStyles>>[number];

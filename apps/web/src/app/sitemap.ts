import type { MetadataRoute } from "next";
import { getAllIdeaPages, getRooms, getStyles } from "@/lib/data";
import { exampleFor } from "@/lib/examples";
import { defaultLocale, hreflang, locales, paths, siteUrl, type Locale } from "@/lib/i18n";

const abs = (path: string) => new URL(path, siteUrl).toString();

function languages(pathFor: (l: Locale) => string) {
  const out: Record<string, string> = {};
  for (const l of locales) out[hreflang[l]] = abs(pathFor(l));
  out["x-default"] = abs(pathFor(defaultLocale));
  return out;
}

// One entry per URL, each listing all its language versions (hreflang must be reciprocal).
// Past 50 000 URLs this splits via generateSitemaps (ADR 0001).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rooms, styles, pages] = await Promise.all([
    getRooms(defaultLocale),
    getStyles(defaultLocale),
    getAllIdeaPages(),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  for (const l of locales) {
    entries.push({ url: abs(paths.home(l)), alternates: { languages: languages(paths.home) } });
    entries.push({ url: abs(paths.ideas(l)), alternates: { languages: languages(paths.ideas) } });
    entries.push({ url: abs(paths.styles(l)), alternates: { languages: languages(paths.styles) } });
    for (const r of rooms) {
      entries.push({
        url: abs(paths.room(l, r.slug)),
        alternates: { languages: languages((x) => paths.room(x, r.slug)) },
      });
    }
    for (const s of styles) {
      entries.push({
        url: abs(paths.style(l, s.slug)),
        alternates: { languages: languages((x) => paths.style(x, s.slug)) },
      });
    }
  }
  for (const p of pages) {
    const example = exampleFor(p.room, p.style);
    entries.push({
      url: abs(paths.idea(p.locale, p.room, p.style)),
      lastModified: p.updatedAt,
      alternates: { languages: languages((x) => paths.idea(x, p.room, p.style)) },
      // Image sitemap: lets Google Images find the before/after examples (ADR 0007).
      ...(example && { images: [abs(example.before), abs(example.after)] }),
    });
  }
  return entries;
}

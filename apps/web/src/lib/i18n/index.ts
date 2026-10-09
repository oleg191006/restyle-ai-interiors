import { en } from "./en";
import { uk } from "./uk";

export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uk";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// hreflang codes for <link rel="alternate">; uk-UA so Google maps it to Ukraine searches.
export const hreflang: Record<Locale, string> = { uk: "uk-UA", en: "en" };

// Absolute base for canonical, hreflang and sitemap URLs. On Vercel, falls back to the
// production domain so preview builds never emit localhost.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const dictionaries: Record<Locale, Dictionary> = { uk, en };

export type Dictionary = typeof uk;
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export const paths = {
  home: (l: Locale) => `/${l}`,
  ideas: (l: Locale) => `/${l}/ideas`,
  styles: (l: Locale) => `/${l}/styles`,
  room: (l: Locale, room: string) => `/${l}/ideas/${room}`,
  style: (l: Locale, style: string) => `/${l}/styles/${style}`,
  idea: (l: Locale, room: string, style: string) => `/${l}/ideas/${room}/${style}`,
  account: (l: Locale) => `/${l}/account`,
  redesign: (l: Locale, room?: string, style?: string) => {
    const q = new URLSearchParams({ ...(room && { room }), ...(style && { style }) }).toString();
    return `/${l}/redesign${q ? `?${q}` : ""}`;
  },
};

/** `alternates` block for generateMetadata: canonical + hreflang for every locale + x-default. */
export function alternatesFor(locale: Locale, pathFor: (l: Locale) => string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[hreflang[l]] = pathFor(l);
  languages["x-default"] = pathFor(defaultLocale);
  return { canonical: pathFor(locale), languages };
}

/** Fill `{name}` placeholders in a dictionary string. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

import { paths, type Dictionary, type Locale } from "@/lib/i18n";

/** The site sections shared by the header and the footer. */
export const siteNav = (t: Dictionary, locale: Locale) => [
  { href: paths.styles(locale), label: t.navStyles },
  { href: paths.ideas(locale), label: t.navRooms },
  { href: `${paths.home(locale)}#pricing`, label: t.navPricing },
];

export const otherLocale = (locale: Locale): Locale => (locale === "uk" ? "en" : "uk");

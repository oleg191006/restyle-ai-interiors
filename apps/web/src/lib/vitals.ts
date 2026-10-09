// Field data and analytics only: lab runs (Lighthouse, PSI, headless Chrome) and crawlers would
// skew them. "restyle-e2e" marks our own end-to-end test runs.
const nonHuman = /bot|crawl|spider|lighthouse|headlesschrome|chrome-lighthouse|pagespeed|restyle-e2e/i;
export const isNonHuman = (ua: string) => nonHuman.test(ua);

/** Collapse a concrete path to its route template so RUM samples aggregate per page type. */
export function routeTemplate(path: string) {
  const [, locale, section, a, b] = path.split("/");
  if (!locale) return "/";
  if (!section) return "/[locale]";
  if (section === "ideas") return b ? "/[locale]/ideas/[room]/[style]" : a ? "/[locale]/ideas/[room]" : "/[locale]/ideas";
  if (section === "styles") return a ? "/[locale]/styles/[style]" : "/[locale]/styles";
  if (section === "redesign") return "/[locale]/redesign";
  return "/other";
}

/**
 * Coarse browser family from the user agent. Every iOS browser runs on WebKit, so they share
 * one bucket. Only "chrome" feeds CrUX, the field data Google uses for ranking.
 */
export function browserOf(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

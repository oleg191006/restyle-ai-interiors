/** Collapse a concrete path to its route template so RUM samples aggregate per page type. */
export function routeTemplate(path: string) {
  const [, locale, section, a, b] = path.split("/");
  if (!locale) return "/";
  if (!section) return "/[locale]";
  if (section === "ideas") return b ? "/[locale]/ideas/[room]/[style]" : a ? "/[locale]/ideas/[room]" : "/other";
  if (section === "styles" && a) return "/[locale]/styles/[style]";
  return "/other";
}

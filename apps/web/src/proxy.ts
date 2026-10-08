import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, locales, type Locale } from "@/lib/i18n";

function preferredLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const lang = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (hasLocale(lang)) return lang;
  }
  return defaultLocale;
}

// Only URLs without a locale prefix are redirected; localized URLs pass through untouched
// so landing pages stay cacheable.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // All our URLs are lowercase. Fold any other casing into one canonical URL with a
  // permanent redirect instead of serving duplicates or 404s (e.g. /UK/ideas/Kitchen).
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  const first = pathname.split("/")[1];
  if (locales.some((l) => l === first)) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  // 307: the target depends on Accept-Language, so it must not be cached as permanent.
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!_next|api|sitemap.xml|robots.txt|favicon.ico|.*\\..*).*)"],
};

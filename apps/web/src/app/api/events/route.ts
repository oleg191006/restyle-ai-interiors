import { analyticsEnabled, track } from "@/lib/analytics";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isNonHuman, routeTemplate } from "@/lib/vitals";
import { visitorId } from "@/lib/visitor";

/**
 * Page views from the browser (ADR 0012). Static pages cannot record a view on the server
 * (the CDN answers), so a tiny beacon reports it here and the server forwards it to PostHog.
 * Only `page_viewed` is accepted: the browser cannot invent funnel events such as payments.
 */
export async function POST(request: Request) {
  if (!analyticsEnabled() || isNonHuman(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const limited = await rateLimit(request, "events", [{ max: 60, seconds: 60 }]);
  if (limited) return tooManyRequests(limited);

  let body: { path?: unknown; referrer?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const { path, referrer } = body ?? {};
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 200) return new Response(null, { status: 400 });

  // Only the referring host: full referrer URLs can carry other sites' query strings.
  let referringHost: string | undefined;
  try {
    if (typeof referrer === "string" && referrer) referringHost = new URL(referrer).host;
  } catch {}

  track(await visitorId(), "page_viewed", {
    $current_url: path,
    route: routeTemplate(path),
    locale: path.split("/")[1],
    $referring_domain: referringHost,
  });
  return new Response(null, { status: 204 });
}

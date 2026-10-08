import { prisma, type FormFactor, type VitalName } from "@restyle/db";
import { routeTemplate } from "@/lib/vitals";

// Field data only: lab runs (Lighthouse, PSI, headless Chrome) and crawlers would skew p75.
const nonHuman = /bot|crawl|spider|lighthouse|headlesschrome|chrome-lighthouse|pagespeed/i;

const names = new Set<string>(["LCP", "INP", "CLS", "FCP", "TTFB"]);
const ratings = new Set(["good", "needs-improvement", "poor"]);
const MAX_SAMPLES = 20; // matches the client batch size
const MAX_VALUE = 120_000; // anything above 2 min is a broken measurement

const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), MAX_VALUE) : 0);
const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 100) : "");

/** Rebuilt field by field: only known keys and bounded values reach the database. */
function inpAttribution(a: unknown) {
  if (typeof a !== "object" || a === null) return undefined;
  const r = a as Record<string, unknown>;
  return {
    event: text(r.event),
    target: text(r.target),
    startTime: ms(r.startTime),
    inputDelay: ms(r.inputDelay),
    processing: ms(r.processing),
    presentation: ms(r.presentation),
  };
}

export async function POST(request: Request) {
  if (nonHuman.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const { formFactor, samples } = (body ?? {}) as { formFactor?: unknown; samples?: unknown };
  if ((formFactor !== "mobile" && formFactor !== "desktop") || !Array.isArray(samples)) {
    return new Response(null, { status: 400 });
  }

  const rows = samples
    .slice(0, MAX_SAMPLES)
    .filter(
      (s): s is { name: VitalName; value: number; rating: string; path: string; navigation: string } =>
        typeof s === "object" &&
        s !== null &&
        names.has(s.name) &&
        typeof s.value === "number" &&
        Number.isFinite(s.value) &&
        s.value >= 0 &&
        s.value <= MAX_VALUE &&
        ratings.has(s.rating) &&
        typeof s.path === "string" &&
        s.path.startsWith("/") &&
        s.path.length <= 200 &&
        typeof s.navigation === "string" &&
        s.navigation.length <= 30,
    )
    .map((s) => ({
      name: s.name,
      value: s.value,
      rating: s.rating,
      path: s.path,
      route: routeTemplate(s.path),
      navigation: s.navigation,
      formFactor: formFactor as FormFactor,
      attribution: s.name === "INP" ? inpAttribution((s as { attribution?: unknown }).attribution) : undefined,
    }));

  if (rows.length > 0) await prisma.webVital.createMany({ data: rows });
  return new Response(null, { status: 204 });
}

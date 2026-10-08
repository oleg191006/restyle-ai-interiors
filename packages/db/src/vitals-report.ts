import "dotenv/config";
import { prisma } from "./index.ts";

// Field Core Web Vitals, aggregated the way Google does: 75th percentile per metric,
// per page type and form factor, over the last N days (CrUX uses 28).
const days = Number(process.argv[2] ?? 28);

const thresholds: Record<string, [good: number, poor: number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

// web-vitals re-reports a metric each time the page is hidden, so both queries keep the
// latest row per metricId. Rows from before metricId existed have none and count individually.

type Row = { route: string; formFactor: string; name: string; p75: number; samples: bigint };

async function summary() {
  const rows = await prisma.$queryRaw<Row[]>`
    WITH dedup AS (
      SELECT DISTINCT ON (COALESCE("metricId", id::text)) *
      FROM "WebVital"
      WHERE "createdAt" > now() - make_interval(days => ${days})
      ORDER BY COALESCE("metricId", id::text), "createdAt" DESC
    )
    SELECT route, "formFactor"::text AS "formFactor", name::text AS name,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
           count(*) AS samples
    FROM dedup
    GROUP BY route, "formFactor", name
    ORDER BY route, "formFactor", name`;

  if (rows.length === 0) {
    console.log(`No samples in the last ${days} days.`);
    return false;
  }

  console.log(`Field Core Web Vitals, p75, last ${days} days\n`);
  console.table(
    rows.map((r) => {
      const [good, poor] = thresholds[r.name];
      const rating = r.p75 <= good ? "good" : r.p75 <= poor ? "needs improvement" : "POOR";
      return {
        route: r.route,
        device: r.formFactor,
        metric: r.name,
        p75: r.name === "CLS" ? r.p75.toFixed(3) : `${Math.round(r.p75)} ms`,
        rating,
        samples: Number(r.samples),
      };
    }),
  );
  return true;
}

type Phase = { event: string; duration: number; inputDelay: number; processing: number; presentation: number };
type Frame = { duration: number; blocking: number; render: number; scripts: { source: string; duration: number }[] };
type Attribution = { target?: string; startTime?: number; events?: Phase[]; frames?: Frame[]; event?: string } & Partial<Phase>;
type Interaction = { value: number; path: string; formFactor: string; createdAt: Date; attribution: Attribution | null };

async function worstInteractions() {
  const rows = await prisma.$queryRaw<Interaction[]>`
    SELECT DISTINCT ON (COALESCE("metricId", id::text))
           value, path, "formFactor"::text AS "formFactor", "createdAt", attribution
    FROM "WebVital"
    WHERE name = 'INP' AND "createdAt" > now() - make_interval(days => ${days})
    ORDER BY COALESCE("metricId", id::text), "createdAt" DESC`;
  if (rows.length === 0) return;

  // The biggest phase says where to look: input delay = main thread busy (hydration,
  // long tasks), processing = slow handlers, presentation = rendering the next frame.
  console.log("\nSlowest interactions (INP)\n");
  for (const r of rows.sort((a, b) => b.value - a.value).slice(0, 5)) {
    const a = r.attribution ?? {};
    console.log(
      `${Math.round(r.value)} ms  ${r.formFactor}  ${r.path}  → ${a.target ?? "(no attribution)"}` +
        (a.startTime !== undefined ? `  at ${a.startTime} ms` : "") +
        `  (${r.createdAt.toISOString().slice(0, 16)})`,
    );
    // Older rows stored a single event flat on the object.
    const events = a.events ?? (a.event ? [{ ...(a as Phase), event: a.event }] : []);
    for (const e of events) {
      console.log(
        `    ${e.event.padEnd(12)} ${String(e.duration).padStart(5)} ms = input delay ${e.inputDelay} + processing ${e.processing} + presentation ${e.presentation}`,
      );
    }
    for (const f of a.frames ?? []) {
      console.log(`    long frame ${f.duration} ms (blocking ${f.blocking}, render ${f.render})`);
      for (const s of f.scripts) console.log(`      script ${s.duration} ms  ${s.source}`);
    }
    if (a.events && !a.frames?.length) console.log("    no long animation frames overlapped (or browser lacks LoAF)");
  }
}

summary()
  .then((hasData) => (hasData ? worstInteractions() : undefined))
  .finally(() => prisma.$disconnect());

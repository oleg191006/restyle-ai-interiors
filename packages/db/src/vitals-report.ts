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

type Row = { route: string; formFactor: string; name: string; p75: number; samples: bigint };

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT route, "formFactor"::text AS "formFactor", name::text AS name,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
           count(*) AS samples
    FROM "WebVital"
    WHERE "createdAt" > now() - make_interval(days => ${days})
    GROUP BY route, "formFactor", name
    ORDER BY route, "formFactor", name`;

  if (rows.length === 0) {
    console.log(`No samples in the last ${days} days.`);
    return;
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
}

main().finally(() => prisma.$disconnect());

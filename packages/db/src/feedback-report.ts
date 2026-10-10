import "dotenv/config";
import { prisma } from "./index.ts";

// 👍 / 👎 on real jobs per prompt version (ADR 0015): the field counterpart of the prompt eval
// (ADR 0006). Down reasons use the eval's words, so both can be read side by side.
//
//   pnpm feedback:report        last 28 days
//   pnpm feedback:report 7      last 7 days
const days = Number(process.argv[2] ?? 28);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Below this many ratings a percentage is mostly noise; it is shown, but flagged.
const MIN_RATINGS = 30;

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

const [done, rated, reasons] = await Promise.all([
  prisma.generation.groupBy({ by: ["promptVersion"], where: { status: "done", createdAt: { gte: since } }, _count: true }),
  prisma.generation.groupBy({ by: ["promptVersion", "rating"], where: { rating: { not: null }, createdAt: { gte: since } }, _count: true }),
  prisma.generation.groupBy({ by: ["promptVersion", "ratingReason"], where: { rating: "down", createdAt: { gte: since } }, _count: true }),
]);

if (done.length === 0) {
  console.log(`No finished jobs in the last ${days} days.`);
} else {
  const versions = [...new Set(done.map((d) => d.promptVersion ?? "unknown"))].sort();
  const count = <T extends { promptVersion: string | null; _count: number }>(rows: T[], match: (r: T) => boolean) =>
    rows.filter(match).reduce((n, r) => n + r._count, 0);

  console.log(`Ratings per prompt version, last ${days} days\n`);
  console.table(
    Object.fromEntries(
      versions.map((v) => {
        const of = (r: { promptVersion: string | null }) => (r.promptVersion ?? "unknown") === v;
        const jobs = count(done, of);
        const up = count(rated, (r) => of(r) && r.rating === "up");
        const down = count(rated, (r) => of(r) && r.rating === "down");
        const reason = (name: string | null) => count(reasons, (r) => of(r) && r.ratingReason === name);
        return [
          v,
          {
            jobs,
            rated: `${up + down} (${pct(up + down, jobs)})`,
            "👍": pct(up, up + down),
            "added windows/doors": reason("invented_architecture"),
            "barely changed": reason("barely_changed"),
            "wrong style": reason("wrong_style"),
            "poor quality": reason("poor_quality"),
            "no reason": reason(null),
            note: up + down < MIN_RATINGS ? `< ${MIN_RATINGS} ratings: too few to compare` : "",
          },
        ];
      }),
    ),
  );
}

await prisma.$disconnect();

import "server-only";
import { prisma } from "@restyle/db";
import { intEnv } from "./env";

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

/**
 * Checked before a job is queued. The global cap stays below the free Workers AI allowance,
 * so the site degrades to a clear message instead of a bill (ADR 0005).
 */
export async function checkLimits(visitorId: string): Promise<"ok" | "visitor" | "global"> {
  const since = dayAgo();
  const [mine, all] = await Promise.all([
    prisma.generation.count({ where: { visitorId, createdAt: { gte: since } } }),
    prisma.generation.count({ where: { createdAt: { gte: since }, status: { not: "failed" } } }),
  ]);
  if (mine >= intEnv("GENERATION_LIMIT_PER_VISITOR", 5)) return "visitor";
  if (all >= intEnv("GENERATION_LIMIT_DAILY", 50)) return "global";
  return "ok";
}

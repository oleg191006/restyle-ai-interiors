import "server-only";
import { prisma } from "@restyle/db";
import { entitlementsFor } from "./entitlements";
import { intEnv } from "./env";
import type { Requester } from "./requester";

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

// Failed jobs are not counted: the person should not pay for our errors.
const counted = { status: { not: "failed" as const } };

/** Jobs started in the last 24 hours by this account, or by this anonymous visitor. */
export function usedToday(who: Requester) {
  const mine = who.user ? { userId: who.user.id } : { visitorId: who.visitorId, userId: null };
  return prisma.generation.count({ where: { ...mine, ...counted, createdAt: { gte: dayAgo() } } });
}

/**
 * Checked before a job is queued. The plan limit comes from the entitlements (ADR 0010); the
 * global cap stays below the free Workers AI allowance, so the site degrades to a clear
 * message instead of a bill (ADR 0005).
 */
export async function checkLimits(who: Requester): Promise<"ok" | "plan" | "global"> {
  const [mine, all] = await Promise.all([
    usedToday(who),
    prisma.generation.count({ where: { ...counted, createdAt: { gte: dayAgo() } } }),
  ]);
  if (mine >= entitlementsFor(who.plan).generationsPerDay) return "plan";
  if (all >= intEnv("GENERATION_LIMIT_DAILY", 50)) return "global";
  return "ok";
}

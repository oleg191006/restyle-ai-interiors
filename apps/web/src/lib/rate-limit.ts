import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@restyle/db";

// IP rate limiting on Postgres (ADR 0008). The per-visitor cookie limit is easy to bypass by
// dropping the cookie; the IP is not. Counted per action over one or more windows.

export type Window = { max: number; seconds: number };

/** The client IP as set by Vercel's edge (first x-forwarded-for entry). */
function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * HMAC instead of the raw IP: the table must not become a log of visitors' addresses. The
 * secret salt matters, because a plain hash of an IPv4 address is reversible by brute force.
 */
function subject(request: Request) {
  const salt = process.env.RATE_LIMIT_SALT ?? "local-dev-salt";
  return createHmac("sha256", salt).update(clientIp(request)).digest("base64url").slice(0, 22);
}

/**
 * Counts this request and returns the window it exceeds, or null if allowed. Count-then-insert
 * is not atomic, so a burst can overshoot by a few requests; acceptable for abuse protection.
 */
export async function rateLimit(request: Request, action: string, windows: Window[]) {
  const key = `${action}:${subject(request)}`;
  const now = Date.now();
  const counts = await Promise.all(
    windows.map((w) => prisma.rateLimitHit.count({ where: { key, createdAt: { gte: new Date(now - w.seconds * 1000) } } })),
  );
  const exceeded = windows.find((w, i) => counts[i] >= w.max);
  if (exceeded) return exceeded;

  await prisma.rateLimitHit.create({ data: { key } });
  if (Math.random() < 0.01) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now - 2 * 86_400_000) } } });
  }
  return null;
}

/** 429 with Retry-After, so well-behaved clients know when to come back. */
export function tooManyRequests(window: Window, error = "rate_limited") {
  return Response.json({ error }, { status: 429, headers: { "Retry-After": String(window.seconds) } });
}

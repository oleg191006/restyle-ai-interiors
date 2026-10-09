import { prisma } from "@restyle/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { presignDownload } from "@/lib/storage";

// Photos are deleted from storage after 7 days (R2 lifecycle rule, ADR 0005); older jobs would
// show broken images, and the privacy note promises they are gone.
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The signed-in person's finished redesigns, newest first, with short-lived image URLs. Only
 * accounts have a history: an anonymous visitor's cookie is not something to come back to.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.generation.findMany({
    where: { userId: session.user.id, status: "done", outputKey: { not: null }, createdAt: { gte: new Date(Date.now() - KEEP_MS) } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, createdAt: true, roomSlug: true, styleSlug: true, inputKey: true, outputKey: true },
  });
  const items = await Promise.all(
    rows.map(async (g) => ({
      id: g.id,
      createdAt: g.createdAt,
      room: g.roomSlug,
      style: g.styleSlug,
      before: await presignDownload(g.inputKey),
      after: await presignDownload(g.outputKey!),
    })),
  );
  return Response.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}

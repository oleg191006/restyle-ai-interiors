import { prisma } from "@restyle/db";
import { track } from "@/lib/analytics";
import { parseFeedback } from "@/lib/feedback";
import { visitorId } from "@/lib/visitor";

/**
 * 👍 / 👎 on a finished redesign (ADR 0015). Only the visitor who ran the job can rate it, and
 * rating again replaces the previous answer. Stored next to `promptVersion`, so prompt
 * versions can be compared on real photos (`pnpm feedback:report`).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/generations/[id]/feedback">) {
  const feedback = parseFeedback(await request.json().catch(() => null));
  if (!feedback) return Response.json({ error: "invalid" }, { status: 400 });

  const { id } = await params;
  const visitor = await visitorId();
  const g = await prisma.generation.findUnique({
    where: { id },
    select: { visitorId: true, userId: true, status: true, promptVersion: true, roomSlug: true, styleSlug: true },
  });
  // Someone else's job looks exactly like a missing one, as in the status route.
  if (!g || g.visitorId !== visitor) return Response.json({ error: "not_found" }, { status: 404 });
  if (g.status !== "done") return Response.json({ error: "not_done" }, { status: 409 });

  await prisma.generation.update({
    where: { id },
    data: { rating: feedback.rating, ratingReason: feedback.reason, ratedAt: new Date() },
  });
  track(g.userId ?? g.visitorId, "generation_rated", {
    rating: feedback.rating,
    reason: feedback.reason,
    promptVersion: g.promptVersion,
    room: g.roomSlug,
    style: g.styleSlug,
  });
  return Response.json({ ok: true });
}

import { prisma } from "@restyle/db";
import { getRoom, getStyle } from "@/lib/data";
import { hasLocale } from "@/lib/i18n";
import { getProvider } from "@/lib/ai";
import { track } from "@/lib/analytics";
import { checkLimits } from "@/lib/limits";
import { enqueueGeneration } from "@/lib/queue";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { requester } from "@/lib/requester";

/** Step 2 of ADR 0005: record the job and hand it to the queue. The response is instant. */
export async function POST(request: Request) {
  const limited = await rateLimit(request, "generate", [{ max: 15, seconds: 86_400 }]);
  if (limited) return tooManyRequests(limited);

  const who = await requester();
  const visitor = who.visitorId;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const { inputKey, room, style, locale } = body;

  if (
    typeof inputKey !== "string" ||
    !new RegExp(`^inputs/${visitor}/[0-9a-f-]{36}\.jpg$`).test(inputKey) || // only your own upload
    typeof room !== "string" ||
    typeof style !== "string" ||
    typeof locale !== "string" ||
    !hasLocale(locale)
  ) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const [roomRow, styleRow] = await Promise.all([getRoom(locale, room), getStyle(locale, style)]);
  if (!roomRow || !styleRow) return Response.json({ error: "unknown_room_or_style" }, { status: 400 });

  const distinctId = who.user?.id ?? who.visitorId;
  const limit = await checkLimits(who);
  if (limit !== "ok") {
    track(distinctId, "limit_reached", { plan: who.plan, scope: limit, at: "generate" });
    return Response.json({ error: `limit_${limit}`, plan: who.plan }, { status: 429 });
  }

  const generation = await prisma.generation.create({
    data: { visitorId: visitor, userId: who.user?.id, locale, roomSlug: room, styleSlug: style, inputKey, provider: getProvider().name },
  });
  try {
    await enqueueGeneration(generation.id);
  } catch (e) {
    await prisma.generation.update({ where: { id: generation.id }, data: { status: "failed", error: "queue_unavailable" } });
    console.error("enqueue failed", e);
    return Response.json({ error: "queue_unavailable" }, { status: 503 });
  }
  track(distinctId, "generation_requested", { plan: who.plan, room, style, locale });
  return Response.json({ id: generation.id }, { status: 202 });
}

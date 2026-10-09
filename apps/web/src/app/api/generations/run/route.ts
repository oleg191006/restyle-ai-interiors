import { prisma } from "@restyle/db";
import { buildPrompt, currentPromptVersion, getProvider } from "@/lib/ai";
import { track } from "@/lib/analytics";
import { PermanentError } from "@/lib/ai/types";
import { getStyle, getRoom } from "@/lib/data";
import { verifyQStash } from "@/lib/queue";
import { readObject, writeObject } from "@/lib/storage";

export const maxDuration = 60;

const MAX_ATTEMPTS = 4; // first try + QStash `retries: 3`

/**
 * Step 5 of ADR 0005, called only by QStash. Idempotent: a duplicate or late retry of a job
 * that already finished does nothing. Status codes drive QStash: 2xx = done (no retry),
 * 5xx = retry with backoff.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!(await verifyQStash(request, raw))) return new Response("invalid signature", { status: 401 });

  const { id } = JSON.parse(raw) as { id?: string };
  const g = id ? await prisma.generation.findUnique({ where: { id } }) : null;
  if (!g) return new Response("unknown job", { status: 200 }); // nothing to retry
  if (g.status === "done" || g.status === "failed") return new Response("already finished", { status: 200 });

  const attempt = g.attempts + 1;
  await prisma.generation.update({
    where: { id: g.id },
    data: { status: "running", attempts: attempt, startedAt: g.startedAt ?? new Date() },
  });

  try {
    // English names make better prompts regardless of the visitor's language.
    const [room, style, image] = await Promise.all([getRoom("en", g.roomSlug), getStyle("en", g.styleSlug), readObject(g.inputKey)]);
    if (!room || !style) throw new PermanentError("room or style no longer exists");

    const provider = getProvider();
    const result = await provider.redesign({
      image,
      palette: style.palette,
      prompt: buildPrompt({ room: room.name, style: style.name, materials: style.materials, palette: style.palette }),
    });
    const outputKey = `outputs/${g.id}.${result.contentType === "image/png" ? "png" : "jpg"}`;
    await writeObject(outputKey, result.image, result.contentType);
    await prisma.generation.update({
      where: { id: g.id },
      data: { status: "done", outputKey, provider: provider.name, promptVersion: currentPromptVersion, error: null, finishedAt: new Date() },
    });
    const finishedAt = Date.now();
    // After the job is saved and outside the job's own logic: track() never throws.
    track(g.userId ?? g.visitorId, "generation_completed", {
      provider: provider.name,
      promptVersion: currentPromptVersion,
      attempts: attempt,
      room: g.roomSlug,
      style: g.styleSlug,
      seconds: g.createdAt ? Math.round((finishedAt - g.createdAt.getTime()) / 1000) : undefined,
    });
    return new Response("ok", { status: 200 });
  } catch (e) {
    // Some SDK errors (e.g. connection refused) have an empty message; keep the type then.
    const message = e instanceof Error ? (e.message || e.name).slice(0, 300) : "unknown error";
    const retry = !(e instanceof PermanentError) && attempt < MAX_ATTEMPTS;
    await prisma.generation.update({
      where: { id: g.id },
      data: retry ? { status: "queued", error: message } : { status: "failed", error: message, finishedAt: new Date() },
    });
    console.error(`generation ${g.id} attempt ${attempt} failed`, message);
    if (!retry) track(g.userId ?? g.visitorId, "generation_failed", { error: message.slice(0, 100), attempts: attempt });
    return new Response(retry ? "retry" : "failed", { status: retry ? 503 : 200 });
  }
}

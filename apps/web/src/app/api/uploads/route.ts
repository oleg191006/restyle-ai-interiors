import { checkLimits } from "@/lib/limits";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { requester } from "@/lib/requester";
import { presignUpload } from "@/lib/storage";

const MAX_BYTES = 1_000_000; // the browser sends a ≤ 504 px JPEG, usually 50–150 KB

/**
 * Step 1 of ADR 0005: hand the browser a presigned URL so the photo goes straight to
 * storage and never through a Vercel function. The key is scoped to the visitor, which
 * lets the generation endpoint check that the photo is theirs.
 */
export async function POST(request: Request) {
  // Per IP: a burst limit and a daily cap above the per-visitor one (shared IPs, ADR 0008).
  const limited = await rateLimit(request, "upload", [
    { max: 10, seconds: 60 },
    { max: 30, seconds: 86_400 },
  ]);
  if (limited) return tooManyRequests(limited);

  const who = await requester();
  const { contentType, size } = ((await request.json().catch(() => ({}))) ?? {}) as { contentType?: unknown; size?: unknown };
  if (contentType !== "image/jpeg") return Response.json({ error: "unsupported_type" }, { status: 400 });
  if (typeof size !== "number" || size <= 0 || size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 400 });

  const limit = await checkLimits(who);
  if (limit !== "ok") return Response.json({ error: `limit_${limit}`, plan: who.plan }, { status: 429 });

  const key = `inputs/${who.visitorId}/${crypto.randomUUID()}.jpg`;
  const url = await presignUpload(key, contentType);
  return Response.json({ key, url });
}

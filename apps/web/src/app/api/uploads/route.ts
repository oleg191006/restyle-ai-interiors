import { checkLimits } from "@/lib/limits";
import { presignUpload } from "@/lib/storage";
import { visitorId } from "@/lib/visitor";

const MAX_BYTES = 1_000_000; // the browser sends a ≤ 504 px JPEG, usually 50–150 KB

/**
 * Step 1 of ADR 0005: hand the browser a presigned URL so the photo goes straight to
 * storage and never through a Vercel function. The key is scoped to the visitor, which
 * lets the generation endpoint check that the photo is theirs.
 */
export async function POST(request: Request) {
  const visitor = await visitorId();
  const { contentType, size } = ((await request.json().catch(() => ({}))) ?? {}) as { contentType?: unknown; size?: unknown };
  if (contentType !== "image/jpeg") return Response.json({ error: "unsupported_type" }, { status: 400 });
  if (typeof size !== "number" || size <= 0 || size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 400 });

  const limit = await checkLimits(visitor);
  if (limit !== "ok") return Response.json({ error: `limit_${limit}` }, { status: 429 });

  const key = `inputs/${visitor}/${crypto.randomUUID()}.jpg`;
  const url = await presignUpload(key, contentType);
  return Response.json({ key, url });
}

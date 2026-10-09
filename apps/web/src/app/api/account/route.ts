import { entitlementsFor } from "@/lib/entitlements";
import { usedToday } from "@/lib/limits";
import { requester } from "@/lib/requester";

/**
 * Who am I and how much is left today. Pages stay static (ADR 0001), so the account page and
 * the tool ask this endpoint from the browser instead of reading the session while rendering.
 */
export async function GET() {
  const who = await requester();
  return Response.json(
    {
      email: who.user?.email ?? null,
      plan: who.plan,
      used: await usedToday(who),
      limit: entitlementsFor(who.plan).generationsPerDay,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

import { toNextJsHandler } from "better-auth/next-js";
import { cookies } from "next/headers";
import { linkVisitor, track } from "@/lib/analytics";
import { auth } from "@/lib/auth";
import { VISITOR_COOKIE } from "@/lib/visitor";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

/** Password guessing and mass sign-ups are limited per IP before Better Auth sees them. */
export async function POST(request: Request) {
  const action = new URL(request.url).pathname.match(/\/sign-(in|up)\//)?.[1];
  if (action) {
    const limited = await rateLimit(request, "auth", [
      { max: 10, seconds: 60 },
      { max: 50, seconds: 86_400 },
    ]);
    if (limited) return tooManyRequests(limited);
  }
  const response = await handlers.POST(request);
  if (action && response.ok) {
    const userId = (await response.clone().json().catch(() => null))?.user?.id;
    const visitor = (await cookies()).get(VISITOR_COOKIE)?.value;
    if (userId) {
      if (visitor) linkVisitor(visitor, userId);
      track(userId, action === "up" ? "signed_up" : "signed_in");
    }
  }
  return response;
}

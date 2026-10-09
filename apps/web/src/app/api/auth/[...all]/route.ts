import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

/** Password guessing and mass sign-ups are limited per IP before Better Auth sees them. */
export async function POST(request: Request) {
  if (/\/sign-(in|up)\//.test(new URL(request.url).pathname)) {
    const limited = await rateLimit(request, "auth", [
      { max: 10, seconds: 60 },
      { max: 50, seconds: 86_400 },
    ]);
    if (limited) return tooManyRequests(limited);
  }
  return handlers.POST(request);
}

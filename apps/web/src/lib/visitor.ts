import "server-only";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "rs_visitor";
const COOKIE = VISITOR_COOKIE;

/** Random, anonymous visitor id kept in an httpOnly cookie. Only used for daily limits. */
export async function visitorId() {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[a-z0-9-]{20,40}$/.test(existing)) return existing;
  const id = crypto.randomUUID();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return id;
}

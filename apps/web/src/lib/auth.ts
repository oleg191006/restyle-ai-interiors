import "server-only";
import { prisma } from "@restyle/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

/**
 * Accounts (ADR 0010). Email + password for now; Google is a `socialProviders` entry once an
 * OAuth client exists. Sessions live in Postgres and are read only by API routes, so every
 * page stays static. Reads BETTER_AUTH_SECRET from the environment.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.APP_URL,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  // Sign-in and sign-up are limited per IP by our own limiter (ADR 0008) in the route
  // handler; Better Auth's default in-memory limiter does not survive serverless instances.
  rateLimit: { enabled: false },
  telemetry: { enabled: false },
  plugins: [nextCookies()],
});

export type SessionUser = { id: string; email: string };

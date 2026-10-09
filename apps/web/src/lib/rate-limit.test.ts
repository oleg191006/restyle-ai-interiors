import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the RateLimitHit table: just enough of count/create/deleteMany.
const hits = vi.hoisted(() => [] as { key: string; createdAt: Date }[]);
vi.mock("@restyle/db", () => ({
  prisma: {
    rateLimitHit: {
      count: async ({ where }: { where: { key: string; createdAt: { gte: Date } } }) =>
        hits.filter((h) => h.key === where.key && h.createdAt >= where.createdAt.gte).length,
      create: async ({ data }: { data: { key: string } }) => hits.push({ key: data.key, createdAt: new Date() }),
      deleteMany: async () => ({ count: 0 }),
    },
  },
}));

const { rateLimit, tooManyRequests } = await import("./rate-limit");

const from = (ip: string) => new Request("http://localhost/api/uploads", { method: "POST", headers: { "x-forwarded-for": ip } });
const minute = { max: 3, seconds: 60 };
const day = { max: 5, seconds: 86_400 };

beforeEach(() => {
  hits.length = 0;
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to max requests per window, then reports the full window", async () => {
    for (let i = 0; i < 3; i++) expect(await rateLimit(from("198.51.100.1"), "upload", [minute])).toBeNull();
    expect(await rateLimit(from("198.51.100.1"), "upload", [minute])).toEqual(minute);
  });

  it("counts each IP and each action separately", async () => {
    for (let i = 0; i < 3; i++) await rateLimit(from("198.51.100.1"), "upload", [minute]);
    expect(await rateLimit(from("198.51.100.2"), "upload", [minute])).toBeNull();
    expect(await rateLimit(from("198.51.100.1"), "generate", [minute])).toBeNull();
  });

  it("keys by the client IP, the first X-Forwarded-For entry", async () => {
    for (let i = 0; i < 3; i++) await rateLimit(from(`198.51.100.1, 10.0.0.${i}`), "upload", [minute]);
    expect(await rateLimit(from("198.51.100.1"), "upload", [minute])).toEqual(minute);
  });

  it("applies the longer window once the short one has passed", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      expect(await rateLimit(from("198.51.100.1"), "upload", [minute, day])).toBeNull();
      vi.advanceTimersByTime(61_000);
    }
    expect(await rateLimit(from("198.51.100.1"), "upload", [minute, day])).toEqual(day);
  });

  it("does not record a refused request, so waiting is enough to recover", async () => {
    for (let i = 0; i < 6; i++) await rateLimit(from("198.51.100.1"), "upload", [minute]);
    expect(hits).toHaveLength(3);
  });

  it("never stores the IP itself (ADR 0008)", async () => {
    await rateLimit(from("198.51.100.1"), "upload", [minute]);
    expect(hits[0].key).toMatch(/^upload:[\w-]{22}$/);
    expect(hits[0].key).not.toContain("198.51");
  });
});

describe("tooManyRequests", () => {
  it("answers 429 with Retry-After set to the window", async () => {
    const res = tooManyRequests(day);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("86400");
    expect(await res.json()).toEqual({ error: "rate_limited" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// The history lists private photos, so what matters is whose and which: only the signed-in
// person's finished jobs, only while the photos still exist.
const db = vi.hoisted(() => ({ findMany: vi.fn() }));
const session = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@restyle/db", () => ({ prisma: { generation: db } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: { api: session } }));
vi.mock("@/lib/storage", () => ({ presignDownload: async (key: string) => `https://storage.test/${key}` }));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  db.findMany.mockResolvedValue([]);
});

describe("GET /api/account/generations", () => {
  it("is 401 without a session and reads nothing", async () => {
    session.getSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it("lists only this account's finished jobs from the last 7 days", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-09T12:00:00Z") });
    session.getSession.mockResolvedValue({ user: { id: "u1", email: "a@example.com" } });
    await GET();
    const { where } = db.findMany.mock.calls[0][0];
    expect(where).toEqual({
      userId: "u1",
      status: "done",
      outputKey: { not: null },
      createdAt: { gte: new Date("2026-10-02T12:00:00Z") },
    });
    vi.useRealTimers();
  });

  it("returns signed URLs for both photos and is never cached", async () => {
    session.getSession.mockResolvedValue({ user: { id: "u1", email: "a@example.com" } });
    db.findMany.mockResolvedValue([
      { id: "g1", createdAt: new Date(), roomSlug: "kitchen", styleSlug: "loft", inputKey: "inputs/v/1.jpg", outputKey: "outputs/g1.jpg" },
    ]);
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const { items } = await res.json();
    expect(items).toMatchObject([
      { id: "g1", room: "kitchen", style: "loft", before: "https://storage.test/inputs/v/1.jpg", after: "https://storage.test/outputs/g1.jpg" },
    ]);
  });
});

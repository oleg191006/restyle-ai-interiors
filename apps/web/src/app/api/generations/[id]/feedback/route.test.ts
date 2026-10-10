import { beforeEach, describe, expect, it, vi } from "vitest";

// Who may rate what: only the owner, only a finished job, only a valid answer.
const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
const analytics = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@restyle/db", () => ({ prisma: { generation: db } }));
vi.mock("@/lib/analytics", () => analytics);
vi.mock("@/lib/visitor", () => ({ visitorId: async () => "v1" }));

const { POST } = await import("./route");

const job = (over: Record<string, unknown> = {}) => ({
  visitorId: "v1",
  userId: null,
  status: "done",
  promptVersion: "v4",
  roomSlug: "kitchen",
  styleSlug: "scandinavian",
  ...over,
});
const call = (body: unknown) =>
  POST(new Request("http://localhost/api/generations/g1/feedback", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "g1" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.findUnique.mockResolvedValue(job());
});

describe("POST /api/generations/:id/feedback", () => {
  it("saves the rating with its reason and tracks it with the prompt version", async () => {
    const res = await call({ rating: "down", reason: "barely_changed" });
    expect(res.status).toBe(200);
    expect(db.update.mock.calls[0][0]).toMatchObject({
      where: { id: "g1" },
      data: { rating: "down", ratingReason: "barely_changed", ratedAt: expect.any(Date) },
    });
    expect(analytics.track).toHaveBeenCalledWith("v1", "generation_rated", {
      rating: "down",
      reason: "barely_changed",
      promptVersion: "v4",
      room: "kitchen",
      style: "scandinavian",
    });
  });

  it("attributes the event to the account when the job has one", async () => {
    db.findUnique.mockResolvedValue(job({ userId: "u1" }));
    await call({ rating: "up" });
    expect(analytics.track.mock.calls[0][0]).toBe("u1");
  });

  it("is 400 for an invalid body and reads nothing", async () => {
    expect((await call({ rating: "up", reason: "poor_quality" })).status).toBe(400);
    expect((await call({ rating: "great" })).status).toBe(400);
    expect(db.findUnique).not.toHaveBeenCalled();
  });

  it("is 404 for someone else's job or a missing one", async () => {
    db.findUnique.mockResolvedValueOnce(job({ visitorId: "v2" }));
    expect((await call({ rating: "up" })).status).toBe(404);
    db.findUnique.mockResolvedValueOnce(null);
    expect((await call({ rating: "up" })).status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is 409 until the job is done", async () => {
    db.findUnique.mockResolvedValue(job({ status: "running" }));
    expect((await call({ rating: "up" })).status).toBe(409);
    expect(db.update).not.toHaveBeenCalled();
  });
});

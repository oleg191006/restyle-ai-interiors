import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermanentError } from "@/lib/ai/types";

// The worker's contract with QStash is its status code: 2xx stops retries, 5xx retries.
// Everything it talks to is mocked, so these tests pin down that contract only.
const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
const provider = vi.hoisted(() => ({ name: "fake", redesign: vi.fn() }));
const queue = vi.hoisted(() => ({ verifyQStash: vi.fn() }));
const storage = vi.hoisted(() => ({ readObject: vi.fn(), writeObject: vi.fn() }));

vi.mock("@restyle/db", () => ({ prisma: { generation: db } }));
vi.mock("@/lib/queue", () => queue);
vi.mock("@/lib/storage", () => storage);
vi.mock("@/lib/data", () => ({
  getRoom: async (_: string, slug: string) => (slug === "kitchen" ? { slug, name: "Kitchen" } : null),
  getStyle: async (_: string, slug: string) => ({ slug, name: "Loft", materials: ["brick"], palette: ["grey"] }),
}));
vi.mock("@/lib/ai", async () => {
  const prompt = await import("@/lib/ai/prompt");
  return { getProvider: () => provider, buildPrompt: prompt.buildPrompt, currentPromptVersion: prompt.currentPromptVersion };
});

const { POST } = await import("./route");

const job = (over: Record<string, unknown> = {}) => ({
  id: "g1",
  status: "queued",
  attempts: 0,
  startedAt: null,
  roomSlug: "kitchen",
  styleSlug: "loft",
  inputKey: "inputs/v/x.jpg",
  ...over,
});
const call = () => POST(new Request("http://localhost/api/generations/run", { method: "POST", body: JSON.stringify({ id: "g1" }) }));
const lastUpdate = () => db.update.mock.calls.at(-1)?.[0].data;

beforeEach(() => {
  vi.clearAllMocks();
  queue.verifyQStash.mockResolvedValue(true);
  storage.readObject.mockResolvedValue(Buffer.from("in"));
  provider.redesign.mockResolvedValue({ image: Buffer.from("out"), contentType: "image/jpeg" });
});

describe("POST /api/generations/run", () => {
  it("rejects calls without a valid QStash signature and touches nothing", async () => {
    queue.verifyQStash.mockResolvedValue(false);
    expect((await call()).status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
    expect(provider.redesign).not.toHaveBeenCalled();
  });

  it("finishes a job: writes the output and records the prompt version", async () => {
    db.findUnique.mockResolvedValue(job());
    expect((await call()).status).toBe(200);
    expect(storage.writeObject).toHaveBeenCalledWith("outputs/g1.jpg", Buffer.from("out"), "image/jpeg");
    expect(lastUpdate()).toMatchObject({ status: "done", outputKey: "outputs/g1.jpg", promptVersion: expect.any(String) });
  });

  it.each(["done", "failed"])("is idempotent: a redelivered %s job is not run again", async (status) => {
    db.findUnique.mockResolvedValue(job({ status }));
    expect((await call()).status).toBe(200);
    expect(provider.redesign).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("asks QStash to retry a transient error", async () => {
    db.findUnique.mockResolvedValue(job());
    storage.readObject.mockRejectedValue(Object.assign(new Error(""), { name: "ECONNREFUSED" }));
    expect((await call()).status).toBe(503);
    // An empty message falls back to the error type, so the failure stays diagnosable.
    expect(lastUpdate()).toEqual({ status: "queued", error: "ECONNREFUSED" });
  });

  it("does not retry a permanent error", async () => {
    db.findUnique.mockResolvedValue(job());
    provider.redesign.mockRejectedValue(new PermanentError("input rejected"));
    expect((await call()).status).toBe(200);
    expect(lastUpdate()).toMatchObject({ status: "failed", error: "input rejected" });
  });

  it("treats a room that no longer exists as permanent", async () => {
    db.findUnique.mockResolvedValue(job({ roomSlug: "gone" }));
    expect((await call()).status).toBe(200);
    expect(lastUpdate()).toMatchObject({ status: "failed" });
    expect(provider.redesign).not.toHaveBeenCalled();
  });

  it("gives up after the last attempt QStash will make", async () => {
    db.findUnique.mockResolvedValue(job({ attempts: 3 }));
    provider.redesign.mockRejectedValue(new Error("upstream 503"));
    expect((await call()).status).toBe(200);
    expect(lastUpdate()).toMatchObject({ status: "failed", error: "upstream 503" });
  });
});

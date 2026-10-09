import { beforeEach, describe, expect, it, vi } from "vitest";

const ph = vi.hoisted(() => ({ captureImmediate: vi.fn(), aliasImmediate: vi.fn(), getFlag: vi.fn(), evaluateFlags: vi.fn(), flush: vi.fn() }));
const after = vi.hoisted(() => vi.fn((fn: () => unknown) => fn()));
vi.mock("posthog-node", () => ({
  PostHog: class {
    captureImmediate = ph.captureImmediate;
    aliasImmediate = ph.aliasImmediate;
    evaluateFlags = ph.evaluateFlags;
    flush = ph.flush;
  },
}));
vi.mock("next/server", () => ({ after }));

// The client is created once per module, so each test imports a fresh copy with its own env.
async function load(key: string | undefined) {
  vi.resetModules();
  if (key) process.env.POSTHOG_KEY = key;
  else delete process.env.POSTHOG_KEY;
  return import("./analytics");
}

beforeEach(() => {
  vi.clearAllMocks();
  ph.captureImmediate.mockResolvedValue(undefined);
  ph.flush.mockResolvedValue(undefined);
  ph.evaluateFlags.mockImplementation(async () => ({ getFlag: ph.getFlag }));
  after.mockImplementation((fn: () => unknown) => fn());
});

describe("without POSTHOG_KEY", () => {
  it("records nothing and puts everyone in control", async () => {
    const a = await load(undefined);
    a.track("u1", "signed_up");
    a.linkVisitor("v1", "u1");
    expect(after).not.toHaveBeenCalled();
    expect(await a.paywallVariant("u1")).toBe("control");
    expect(ph.evaluateFlags).not.toHaveBeenCalled();
  });
});

describe("with POSTHOG_KEY", () => {
  it("sends events after the response", async () => {
    const a = await load("phc_test");
    a.track("u1", "checkout_started", { variant: "trial" });
    expect(after).toHaveBeenCalledOnce();
    expect(ph.captureImmediate).toHaveBeenCalledWith({ distinctId: "u1", event: "checkout_started", properties: { variant: "trial" } });
  });

  it("links the guest's visitor id to the account", async () => {
    const a = await load("phc_test");
    ph.aliasImmediate.mockResolvedValue(undefined);
    a.linkVisitor("v1", "u1");
    expect(ph.aliasImmediate).toHaveBeenCalledWith({ distinctId: "u1", alias: "v1" });
  });

  it("never throws, so analytics cannot fail a job or a payment", async () => {
    const a = await load("phc_test");
    after.mockImplementation(() => {
      throw new Error("outside a request");
    });
    expect(() => a.track("u1", "generation_completed")).not.toThrow();
    expect(() => a.linkVisitor("v1", "u1")).not.toThrow();
  });

  it.each([
    ["trial", "trial"],
    ["control", "control"],
    [undefined, "control"],
    [true, "control"],
  ])("flag value %o → %s", async (value, arm) => {
    const a = await load("phc_test");
    ph.getFlag.mockReturnValue(value);
    expect(await a.paywallVariant("u1")).toBe(arm);
    expect(ph.evaluateFlags).toHaveBeenCalledWith("u1", { flagKeys: ["paywall-trial"] });
    expect(ph.getFlag).toHaveBeenCalledWith("paywall-trial");
  });

  it("flushes the exposure event after the response, so a frozen function does not lose it", async () => {
    const a = await load("phc_test");
    ph.getFlag.mockReturnValue("trial");
    await a.paywallVariant("u1");
    expect(after).toHaveBeenCalledOnce();
    expect(ph.flush).toHaveBeenCalledOnce();
  });

  it("falls back to control when PostHog is unreachable", async () => {
    const a = await load("phc_test");
    ph.evaluateFlags.mockRejectedValue(new Error("timeout"));
    expect(await a.paywallVariant("u1")).toBe("control");
  });
});

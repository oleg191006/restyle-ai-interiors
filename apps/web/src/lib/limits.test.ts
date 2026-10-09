import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Requester } from "./requester";

const count = vi.hoisted(() => vi.fn());
vi.mock("@restyle/db", () => ({ prisma: { generation: { count } } }));

const { checkLimits, usedToday } = await import("./limits");

const guest: Requester = { visitorId: "v1", user: null, plan: "anonymous" };
const member: Requester = { visitorId: "v1", user: { id: "u1", email: "a@b.c" }, plan: "free" };

// count() is called twice by checkLimits: first for this person, then for the whole site.
const counts = (mine: number, all = 0) => count.mockResolvedValueOnce(mine).mockResolvedValueOnce(all);

beforeEach(() => count.mockReset());

describe("usedToday", () => {
  it("counts a guest's jobs by visitor cookie, excluding jobs made while signed in", async () => {
    count.mockResolvedValue(0);
    await usedToday(guest);
    expect(count.mock.calls[0][0].where).toMatchObject({ visitorId: "v1", userId: null });
  });

  it("counts a member's jobs by account, on any device", async () => {
    count.mockResolvedValue(0);
    await usedToday(member);
    const where = count.mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: "u1" });
    expect(where).not.toHaveProperty("visitorId");
  });

  it("does not count failed jobs against the person", async () => {
    count.mockResolvedValue(0);
    await usedToday(guest);
    expect(count.mock.calls[0][0].where.status).toEqual({ not: "failed" });
  });
});

describe("checkLimits", () => {
  it.each([
    [guest, 1, "ok"],
    [guest, 2, "plan"],
    [member, 2, "ok"],
    [member, 4, "ok"],
    [member, 5, "plan"],
  ] as const)("%# %o with %i used today → %s", async (who, used, result) => {
    counts(used);
    expect(await checkLimits(who)).toBe(result);
  });

  it("stops everyone at the site-wide cap", async () => {
    counts(0, 50);
    expect(await checkLimits(member)).toBe("global");
  });

  it("reports the personal limit first, so the message offers the next plan", async () => {
    counts(2, 50);
    expect(await checkLimits(guest)).toBe("plan");
  });
});

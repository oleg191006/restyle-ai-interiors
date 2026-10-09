import { beforeEach, describe, expect, it, vi } from "vitest";

// syncSubscription with Stripe and the database replaced: checks how a Stripe Subscription
// object becomes our row.
process.env.STRIPE_SECRET_KEY = "sk_test_unit";

const retrieve = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({ upsert: vi.fn(), findUser: vi.fn() }));
vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve };
  },
}));
vi.mock("@restyle/db", () => ({
  prisma: { subscription: { upsert: db.upsert }, user: { findUnique: db.findUser } },
}));

const { handleStripeEvent, syncSubscription } = await import("./billing");

const periodEnd = Date.UTC(2026, 10, 9) / 1000;
const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  metadata: { userId: "u1" },
  cancel_at_period_end: false,
  cancel_at: null,
  items: { data: [{ price: { id: "price_pro" }, current_period_end: periodEnd }] },
  ...over,
});
const written = () => db.upsert.mock.calls.at(-1)?.[0].update;

beforeEach(() => vi.clearAllMocks());

describe("syncSubscription", () => {
  it("copies status, price and the period end from the subscription item", async () => {
    retrieve.mockResolvedValue(sub());
    await syncSubscription("sub_1");
    expect(written()).toEqual({
      userId: "u1",
      status: "active",
      priceId: "price_pro",
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: false,
    });
  });

  it("finds the user by Stripe customer when the metadata is missing", async () => {
    retrieve.mockResolvedValue(sub({ metadata: {} }));
    db.findUser.mockResolvedValue({ id: "u2" });
    await syncSubscription("sub_1");
    expect(db.findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { stripeCustomerId: "cus_1" } }));
    expect(written().userId).toBe("u2");
  });

  it("fails loudly for a subscription of an unknown user, so Stripe retries", async () => {
    retrieve.mockResolvedValue(sub({ metadata: {} }));
    db.findUser.mockResolvedValue(null);
    await expect(syncSubscription("sub_1")).rejects.toThrow(/no known user/);
  });

  it.each([
    [{ cancel_at_period_end: true }, true],
    [{ cancel_at: periodEnd }, true],
    [{}, false],
  ])("treats %o as cancelling: %s", async (over, expected) => {
    retrieve.mockResolvedValue(sub(over));
    await syncSubscription("sub_1");
    expect(written().cancelAtPeriodEnd).toBe(expected);
  });
});

describe("handleStripeEvent", () => {
  it("re-reads the subscription instead of trusting the event payload", async () => {
    retrieve.mockResolvedValue(sub({ status: "canceled" }));
    // The payload says active, Stripe now says canceled: what Stripe says now wins.
    await handleStripeEvent({ type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active" } } } as never);
    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(written().status).toBe("canceled");
  });

  it("syncs the subscription of a completed subscription checkout", async () => {
    retrieve.mockResolvedValue(sub());
    await handleStripeEvent({ type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_1" } } } as never);
    expect(retrieve).toHaveBeenCalledWith("sub_1");
  });

  it("acknowledges and ignores events it does not use", async () => {
    expect(await handleStripeEvent({ type: "invoice.created", data: { object: {} } } as never)).toBe(false);
    expect(retrieve).not.toHaveBeenCalled();
  });
});

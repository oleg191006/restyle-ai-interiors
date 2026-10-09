import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real Stripe SDK verifies real signatures here; only the database and the event handler
// are replaced, so the test pins the route's contract: who is trusted, what is retried, what is
// skipped.
const SECRET = "whsec_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_unit";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const db = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn() }));
const handleStripeEvent = vi.hoisted(() => vi.fn());
vi.mock("@restyle/db", () => ({ prisma: { stripeEvent: db } }));
vi.mock("@/lib/billing", async (original) => ({ ...(await original<typeof import("@/lib/billing")>()), handleStripeEvent }));

const { POST } = await import("./route");

const event = { id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } };
const payload = JSON.stringify(event);
const signed = (body: string, secret = SECRET) =>
  new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload: body, secret }) },
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.findUnique.mockResolvedValue(null);
  db.create.mockResolvedValue({});
  handleStripeEvent.mockResolvedValue(true);
});

describe("POST /api/stripe/webhook", () => {
  it("processes a correctly signed event and records it", async () => {
    expect((await POST(signed(payload))).status).toBe(200);
    expect(handleStripeEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "evt_1" }));
    expect(db.create).toHaveBeenCalledWith({ data: { id: "evt_1", type: "customer.subscription.updated" } });
  });

  it("rejects an event signed with another secret: nobody can grant themselves Pro", async () => {
    expect((await POST(signed(payload, "whsec_attacker"))).status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a body changed after signing", async () => {
    const req = signed(payload);
    const tampered = new Request(req.url, { method: "POST", body: payload.replace("sub_1", "sub_2"), headers: req.headers });
    expect((await POST(tampered)).status).toBe(400);
  });

  it("rejects a request without a signature", async () => {
    const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload }));
    expect(res.status).toBe(400);
  });

  it("skips an event it has already processed (at-least-once delivery)", async () => {
    db.findUnique.mockResolvedValue({ id: "evt_1" });
    expect((await POST(signed(payload))).status).toBe(200);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("asks Stripe to retry when processing fails, and does not record the event", async () => {
    handleStripeEvent.mockRejectedValue(new Error("db down"));
    expect((await POST(signed(payload))).status).toBe(500);
    expect(db.create).not.toHaveBeenCalled();
  });
});

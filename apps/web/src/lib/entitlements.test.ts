import { describe, expect, it } from "vitest";
import { PRO_STATUSES } from "./billing-config";
import { planFor } from "./entitlements";

const now = Date.UTC(2026, 9, 9);
const day = 24 * 60 * 60 * 1000;
const user = { id: "u1" };
const sub = (status: string, endsInDays: number) => ({ status, currentPeriodEnd: new Date(now + endsInDays * day) });
const plan = (s: ReturnType<typeof sub> | null, u: typeof user | null = user) => planFor(u, s, PRO_STATUSES, now);

describe("planFor", () => {
  it("a visitor without an account is anonymous, whatever else is known", () => {
    expect(plan(sub("active", 10), null)).toBe("anonymous");
  });

  it("an account without a subscription is Free", () => {
    expect(plan(null)).toBe("free");
  });

  it.each([
    ["active", "pro"],
    ["trialing", "pro"],
    // Stripe is retrying the card: keep access instead of cutting someone off mid-month.
    ["past_due", "pro"],
    ["unpaid", "free"],
    ["canceled", "free"],
    ["incomplete", "free"],
    ["incomplete_expired", "free"],
    ["paused", "free"],
  ])("subscription %s → %s", (status, expected) => {
    expect(plan(sub(status, 10))).toBe(expected);
  });

  it("a cancelled-at-period-end subscription stays Pro until the period ends", () => {
    expect(plan(sub("active", 1))).toBe("pro");
  });

  // Safety net: if the cancellation webhook never arrives, access still ends.
  it("ends Pro three days after the period, even if the stored status still says active", () => {
    expect(plan(sub("active", -2))).toBe("pro");
    expect(plan(sub("active", -4))).toBe("free");
  });
});

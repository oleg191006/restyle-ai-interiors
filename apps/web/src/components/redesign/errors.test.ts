import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n";
import { errorMessage, nextStepFor } from "./errors";

const t = getDictionary("en");

describe("errorMessage", () => {
  it("matches the plan carried by a limit code", () => {
    expect(errorMessage("limit_plan:anonymous", t)).toBe(t.toolErrorLimitAnonymous);
    expect(errorMessage("limit_plan:free", t)).toBe(t.toolErrorLimitFree);
    expect(errorMessage("limit_plan:pro", t)).toBe(t.toolErrorLimitVisitor);
  });

  it("treats every site-wide limit the same, whatever the plan", () => {
    expect(errorMessage("limit_global:anonymous", t)).toBe(t.toolErrorLimitGlobal);
    expect(errorMessage("limit_global:free", t)).toBe(t.toolErrorLimitGlobal);
  });

  it("falls back to the generic message", () => {
    expect(errorMessage("rate_limited", t)).toBe(t.toolErrorRateLimited);
    expect(errorMessage("timeout", t)).toBe(t.toolErrorGeneric);
    expect(errorMessage("", t)).toBe(t.toolErrorGeneric);
  });
});

describe("nextStepFor", () => {
  it("offers sign-in to guests and an upgrade to Free, nothing otherwise", () => {
    expect(nextStepFor("limit_plan:anonymous")).toBe("signIn");
    expect(nextStepFor("limit_plan:free")).toBe("upgrade");
    expect(nextStepFor("limit_global:anonymous")).toBeNull();
    expect(nextStepFor("limit_plan:pro")).toBeNull();
  });
});

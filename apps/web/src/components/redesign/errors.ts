import type { Dictionary } from "@/lib/i18n";

/** After a limit error the tool offers one next step: sign in (guest) or upgrade (Free). */
export type NextStep = "signIn" | "upgrade" | null;

/**
 * What to tell the person for an API error code. Limit codes carry the plan
 * ("limit_plan:free", "limit_global:anonymous"), so the message can match it.
 */
export function errorMessage(code: string, t: Dictionary) {
  if (code === "limit_plan:anonymous") return t.toolErrorLimitAnonymous;
  if (code === "limit_plan:free") return t.toolErrorLimitFree;
  if (code.startsWith("limit_plan")) return t.toolErrorLimitVisitor;
  if (code.startsWith("limit_global")) return t.toolErrorLimitGlobal;
  if (code === "rate_limited") return t.toolErrorRateLimited;
  return t.toolErrorGeneric;
}

export function nextStepFor(code: string): NextStep {
  if (code === "limit_plan:anonymous") return "signIn";
  if (code === "limit_plan:free") return "upgrade";
  return null;
}

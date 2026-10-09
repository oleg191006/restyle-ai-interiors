import type { Plan } from "./entitlements";
import type { Dictionary } from "./i18n";

/** Shape of GET /api/account, shared by the account page and the tool (browser side). */
export type Account = { email: string | null; plan: Plan; used: number; limit: number };

export const fetchAccount = (): Promise<Account> => fetch("/api/account", { cache: "no-store" }).then((r) => r.json());

export const usageText = (t: Dictionary, a: Pick<Account, "used" | "limit">) =>
  t.usage.replace("{used}", String(a.used)).replace("{limit}", String(a.limit));

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authRequest, fetchAccount, fetchHistory, goToStripe, type Account, type HistoryItem } from "@/lib/account-client";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * Everything the account page knows: the account (with the Pro offer), the redesign history
 * once signed in, and the Stripe round trips. The page itself is static (ADR 0010).
 */
export function useAccount(locale: Locale, t: Dictionary) {
  const params = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  // Back from Stripe Checkout. The plan changes when the webhook arrives, usually within a
  // second or two, so the page polls until it sees Pro instead of trusting the redirect.
  const [activating, setActivating] = useState(params.get("checkout") === "success");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => fetchAccount({ paywall: true }).then(setAccount);
  useEffect(() => {
    fetchAccount({ paywall: true }).then(setAccount);
  }, []);

  const email = account?.email;
  useEffect(() => {
    if (email) fetchHistory().then(setHistory);
  }, [email]);

  useEffect(() => {
    if (!activating) return;
    let tries = 0;
    const timer = setInterval(async () => {
      const a = await fetchAccount({ paywall: true });
      setAccount(a);
      if (a.plan === "pro" || ++tries >= 15) {
        clearInterval(timer);
        setActivating(false);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [activating]);

  /** Leave for Stripe Checkout or the Customer Portal; stays here with a message if that fails. */
  async function openStripe(path: "checkout" | "portal") {
    setBusy(true);
    setError(null);
    try {
      await goToStripe(path, locale);
    } catch {
      setBusy(false);
      setError(t.billingError);
    }
  }

  async function signOut() {
    await authRequest("sign-out");
    setHistory(null);
    await reload();
  }

  return { account, history, activating, busy, error, reload, openStripe, signOut };
}

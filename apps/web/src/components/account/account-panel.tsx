"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/account-client";
import type { Plan } from "@/lib/entitlements";
import type { Dictionary, Locale } from "@/lib/i18n";
import { AccountCard } from "./account-card";
import { AccountSkeleton } from "./account-skeleton";
import { AuthView } from "./auth-view";
import { ProOffer } from "./pro-offer";
import { RedesignHistory, type Names } from "./redesign-history";
import { useAccount } from "./use-account";

/** The account page: a sign-in form for guests; the account, Pro offer and history once signed in. */
export function AccountPanel({ t, locale, names, limits }: { t: Dictionary; locale: Locale; names: Names; limits: Record<Plan, number> }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { account, history, activating, busy, error, reload, openStripe, signOut } = useAccount(locale, t);

  if (!account) return <AccountSkeleton />;

  const { email } = account;
  if (!email) {
    // Back to where the sign-in was asked for (the tool, with its room and style), or stay here.
    return <AuthView t={t} account={account} limits={limits} onSignedIn={() => (next ? router.push(next) : reload())} />;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
      <aside className="space-y-4 lg:sticky lg:top-6">
        <AccountCard
          t={t}
          locale={locale}
          account={{ ...account, email }}
          busy={busy}
          error={error}
          activating={activating}
          onManage={() => openStripe("portal")}
          onSignOut={signOut}
        />
        {account.plan !== "pro" && !activating && account.pro && (
          <ProOffer t={t} locale={locale} offer={account.pro} busy={busy} onUpgrade={() => openStripe("checkout")} />
        )}
      </aside>
      <RedesignHistory t={t} locale={locale} names={names} items={history} />
    </div>
  );
}

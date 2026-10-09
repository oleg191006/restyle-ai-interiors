import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountPanel, AccountSkeleton } from "@/components/account-panel";
import { getRooms, getStyles } from "@/lib/data";
import { plans } from "@/lib/entitlements";
import { getDictionary, hasLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  // Nothing to find here for search engines.
  return { title: getDictionary(locale).accountTitle, robots: { index: false, follow: false } };
}

// Static shell like the tool page: the session is read by /api/account from the browser, so
// this route keeps ensureStatic = "navigation" (ADR 0010).
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [rooms, styles] = await Promise.all([getRooms(locale), getStyles(locale)]);
  // History rows carry slugs; the names are static, so they come with the page.
  const names = {
    rooms: Object.fromEntries(rooms.map((r) => [r.slug, r.name])),
    styles: Object.fromEntries(styles.map((s) => [s.slug, s.name])),
  };
  const limits = { anonymous: plans.anonymous.generationsPerDay, free: plans.free.generationsPerDay, pro: plans.pro.generationsPerDay };

  return (
    <div className="container-page space-y-8 py-10 sm:py-14">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t.accountTitle}</h1>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountPanel t={t} locale={locale} names={names} limits={limits} />
      </Suspense>
    </div>
  );
}

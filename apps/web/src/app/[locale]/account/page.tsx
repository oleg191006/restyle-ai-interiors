import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountPanel } from "@/components/account-panel";
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

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{t.accountTitle}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.accountLead}</p>
      </header>
      <Suspense>
        <AccountPanel t={t} locale={locale} />
      </Suspense>
    </div>
  );
}

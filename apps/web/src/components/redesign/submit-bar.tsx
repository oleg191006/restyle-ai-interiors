import Link from "next/link";
import { button } from "@/components/ui/button";
import { usageText } from "@/lib/account-client";
import { paths, type Dictionary, type Locale } from "@/lib/i18n";
import type { NextStep } from "./errors";
import type { Phase } from "./use-generation";

/**
 * The submit button, today's quota and one live line: the current step while busy, otherwise
 * the error with its next step (sign in and come back to the same room and style, or upgrade).
 */
export function SubmitBar({
  t,
  locale,
  phase,
  canSubmit,
  quota,
  error,
  nextStep,
  room,
  style,
}: {
  t: Dictionary;
  locale: Locale;
  phase: Phase;
  canSubmit: boolean;
  quota: { used: number; limit: number } | null;
  error: string | null;
  nextStep: NextStep;
  room: string;
  style: string;
}) {
  const status = { uploading: t.toolUploading, queued: t.toolQueued, running: t.toolRunning }[phase as string];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="submit" disabled={!canSubmit} className={button("primary", "xl")}>
          {phase === "done" ? t.toolRegenerate : t.toolSubmit}
        </button>
        {quota && <span className="text-sm text-muted">{usageText(t, quota)}</span>}
      </div>
      <p aria-live="polite" className="text-sm text-muted">
        {status ?? error}{" "}
        {!status && nextStep === "signIn" && (
          <Link href={`${paths.account(locale)}?next=${encodeURIComponent(paths.redesign(locale, room, style))}`} className="font-semibold text-accent hover:underline">
            {t.signIn}
          </Link>
        )}
        {!status && nextStep === "upgrade" && (
          <Link href={paths.account(locale)} className="font-semibold text-accent hover:underline">
            {t.upgrade}
          </Link>
        )}
      </p>
    </div>
  );
}

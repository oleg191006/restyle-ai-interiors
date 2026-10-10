import { useState } from "react";
import type { Rating, RatingReason } from "@/lib/feedback";
import type { Dictionary } from "@/lib/i18n";
import { sendFeedback } from "./api";

const chip = "min-h-10 rounded-full border px-4 text-sm aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background";

/**
 * 👍 / 👎 under a result, and on 👎 the reasons from the prompt rubric (ADR 0015). "Down" is
 * saved at once, so a rating counts even if no reason is picked; a reason updates it.
 * Rendered with `key={result.id}`, so a new result starts unrated.
 */
export function ResultFeedback({ t, jobId }: { t: Dictionary; jobId: string }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [reason, setReason] = useState<RatingReason | null>(null);
  const [failed, setFailed] = useState(false);

  const reasons: Record<RatingReason, string> = {
    invented_architecture: t.feedbackReasonArchitecture,
    barely_changed: t.feedbackReasonUnchanged,
    wrong_style: t.feedbackReasonStyle,
    poor_quality: t.feedbackReasonQuality,
  };

  async function save(nextRating: Rating, nextReason: RatingReason | null = null) {
    setRating(nextRating);
    setReason(nextReason);
    setFailed(!(await sendFeedback(jobId, { rating: nextRating, reason: nextReason })));
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold">{t.feedbackQuestion}</p>
        <div className="flex gap-2">
          <ThumbButton label={t.feedbackUp} pressed={rating === "up"} onClick={() => save("up")} />
          <ThumbButton label={t.feedbackDown} pressed={rating === "down"} down onClick={() => save("down", reason)} />
        </div>
      </div>

      {rating === "down" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t.feedbackWhy}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(reasons) as RatingReason[]).map((r) => (
              <button key={r} type="button" aria-pressed={reason === r} onClick={() => save("down", r)} className={`${chip} border-line-strong hover:border-foreground`}>
                {reasons[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p aria-live="polite" className="text-sm text-muted empty:hidden">
        {failed ? t.feedbackError : rating && (rating === "up" || reason) ? t.feedbackThanks : ""}
      </p>
    </div>
  );
}

function ThumbButton({ label, pressed, down = false, onClick }: { label: string; pressed: boolean; down?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={label} title={label} onClick={onClick} className={`${chip} inline-flex items-center border-line-strong hover:border-foreground`}>
      <svg aria-hidden viewBox="0 0 24 24" className={`size-5 ${down ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" />
      </svg>
    </button>
  );
}

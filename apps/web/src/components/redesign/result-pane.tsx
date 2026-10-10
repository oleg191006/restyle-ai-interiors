import { CompareSlider } from "@/components/compare-slider";
import { button } from "@/components/ui/button";
import { fill, type Dictionary } from "@/lib/i18n";
import type { Result } from "./api";
import type { Photo } from "./prepare-photo";
import { ResultFeedback } from "./result-feedback";
import type { Phase } from "./use-generation";

/**
 * The right-hand side of the tool: an empty state, then the chosen photo with progress steps,
 * then the result in the before/after slider. Presigned storage URLs change per request and
 * come from another host, so the Next.js image optimizer would only add a hop: plain <img>.
 */
export function ResultPane({
  t,
  photo,
  phase,
  result,
  styleName,
  onDownload,
  onAnotherStyle,
}: {
  t: Dictionary;
  photo: Photo | null;
  phase: Phase;
  result: Result | null;
  styleName: string;
  onDownload: () => void;
  onAnotherStyle: () => void;
}) {
  const busy = phase === "uploading" || phase === "queued" || phase === "running";
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      {result ? (
        <>
          <CompareSlider
            label={t.compareLabel}
            beforeLabel={t.toolBefore}
            afterLabel={fill(t.afterIn, { style: styleName })}
            // eslint-disable-next-line @next/next/no-img-element
            before={<img src={result.before} alt={t.toolBefore} className="h-full w-full object-cover" />}
            // eslint-disable-next-line @next/next/no-img-element
            after={<img src={result.after} alt={t.toolAfter} className="h-full w-full object-cover" />}
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onDownload} className={button("dark")}>
              {t.toolDownload}
            </button>
            <button type="button" onClick={onAnotherStyle} className={button("outline")}>
              {t.toolAgain}
            </button>
          </div>
          <ResultFeedback key={result.id} t={t} jobId={result.id} />
        </>
      ) : (
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-line bg-accent-soft">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="" className={`h-full w-full object-cover transition ${busy ? "brightness-90 saturate-50" : ""}`} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-display text-2xl font-semibold">{t.toolEmptyTitle}</p>
              <p className="max-w-sm text-muted">{t.toolEmptyText}</p>
            </div>
          )}
          {busy && <ProgressSteps t={t} phase={phase} styleName={styleName} />}
        </div>
      )}
      <p className="text-sm text-muted">{t.toolPrivacy}</p>
    </aside>
  );
}

function ProgressSteps({ t, phase, styleName }: { t: Dictionary; phase: Phase; styleName: string }) {
  const steps = [
    { label: t.toolProgressUpload, done: phase !== "uploading", active: phase === "uploading" },
    { label: t.toolProgressQueue, done: phase === "running", active: phase === "queued" },
    { label: fill(t.toolProgressGenerate, { style: styleName }), done: false, active: phase === "running" },
  ];
  return (
    <ol className="absolute bottom-4 left-4 space-y-1.5 rounded-xl bg-surface/95 px-5 py-4 text-[15px] shadow-lg">
      {steps.map((s) => (
        <li key={s.label} className={`flex items-center gap-2.5 ${s.active ? "font-semibold" : s.done ? "" : "text-muted"}`}>
          {s.done ? (
            <span aria-hidden className="text-[#2f6b4f]">
              ✓
            </span>
          ) : (
            <span aria-hidden className={`inline-block size-2.5 rounded-full ${s.active ? "animate-pulse bg-accent" : "bg-line-strong"}`} />
          )}
          {s.label}
        </li>
      ))}
    </ol>
  );
}

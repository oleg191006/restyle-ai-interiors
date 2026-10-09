import { useState } from "react";
import { fill, type Dictionary } from "@/lib/i18n";
import type { Photo } from "./prepare-photo";
import { stepLabel } from "./step-label";

/**
 * Step 1. The real control is a visually hidden file input; the drop zone is its <label>, so a
 * click, a drop and the keyboard all reach it. Once a photo is chosen the zone becomes a summary.
 */
export function PhotoField({ t, photo, disabled, onFile }: { t: Dictionary; photo: Photo | null; disabled: boolean; onFile: (file?: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <section className="space-y-3">
      <h2 className={stepLabel}>1 · {t.toolPhoto}</h2>
      <input
        id="tool-photo"
        type="file"
        accept="image/*"
        aria-label={t.toolPhoto}
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0])}
        className="peer sr-only"
      />
      {photo ? (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, nothing to optimize */}
          <img src={photo.preview} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
          <p className="min-w-0 flex-1 text-sm text-muted">
            {fill(t.toolPhotoReady, { width: photo.width, height: photo.height, kb: Math.round(photo.blob.size / 1024) })}
          </p>
          <label htmlFor="tool-photo" className="cursor-pointer rounded-full px-4 py-3 font-semibold text-accent hover:bg-accent-soft">
            {t.toolReplace}
          </label>
        </div>
      ) : (
        <label
          htmlFor="tool-photo"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
            dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft"
          }`}
        >
          <CameraIcon />
          <span className="text-lg font-semibold">{t.toolDrop}</span>
          <span className="text-sm text-muted">{t.toolPhotoHint}</span>
        </label>
      )}
    </section>
  );
}

function CameraIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-accent">
      <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

"use client";

import { useState, type ReactNode } from "react";

/**
 * Before/after with a draggable divider. Both images are rendered by the server (next/image) and
 * passed in; this component only moves the divider through one CSS variable, so it costs well
 * under a kilobyte of JavaScript and the first paint shows a 50/50 split with no layout shift.
 * The range input is the whole control: keyboard (arrows), touch and screen readers work. It is
 * transparent and the handle is a plain element, so no browser's native slider styling shows.
 */
export function CompareSlider({
  before,
  after,
  beforeLabel,
  afterLabel,
  label,
  className = "",
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  label: string;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div
      className={`relative aspect-4/3 overflow-hidden rounded-2xl bg-line ${className}`}
      style={{ "--pos": `${pos}%` } as React.CSSProperties}
    >
      <div className="absolute inset-0">{before}</div>
      <div className="absolute inset-0 [clip-path:inset(0_0_0_var(--pos))]">{after}</div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-(--pos) w-0.5 -translate-x-1/2 bg-white" />
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white sm:top-4 sm:left-4 sm:text-sm">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1e1a16] sm:top-4 sm:right-4 sm:text-sm">
        {afterLabel}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={label}
        className="peer absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-(--pos) size-11 -translate-1/2 rounded-full border-2 border-[#1e1a16] bg-[#fffdf9] shadow-[0_4px_14px_rgb(0_0_0/0.25)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
    </div>
  );
}

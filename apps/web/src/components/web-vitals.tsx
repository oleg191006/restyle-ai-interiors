"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

// Long Animation Frames API (Chrome 123+). Not in TypeScript's DOM lib yet.
type LoafScript = { duration: number; invoker: string; sourceURL: string; sourceFunctionName: string };
type Loaf = PerformanceEntry & { renderStart: number; blockingDuration: number; scripts: LoafScript[] };

type EventPhase = { event: string; duration: number; inputDelay: number; processing: number; presentation: number };
type FrameSummary = { duration: number; blocking: number; render: number; scripts: { source: string; duration: number }[] };
type InpAttribution = {
  target: string;
  startTime: number; // ms since navigation start: an early tap may be waiting on hydration
  events: EventPhase[]; // pointerdown / pointerup / click of the same interaction
  frames: FrameSummary[]; // long animation frames overlapping the interaction
};
type Sample = {
  id: string;
  name: string;
  value: number;
  rating: string;
  path: string;
  navigation: string;
  attribution?: InpAttribution;
};

// Metrics arrive at different times (INP and CLS only settle when the page is hidden),
// so they are queued and flushed in one beacon instead of one request per metric.
const queue: Sample[] = [];
const MAX_BATCH = 20;
// One key per document + navigation + metric. web-vitals ids are not enough: it re-reports a
// metric on every hide, and switching language remounts the root layout, so the hook
// subscribes again and reports the same interaction under a new id.
const documentId = Math.random().toString(36).slice(2);
const lastSent = new Map<string, number>();
const keyOf = (m: Metric) => `${documentId}:${m.navigationId ?? ""}:${m.name}`;
const loafs: Loaf[] = [];

if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("long-animation-frame")) {
  new PerformanceObserver((list) => {
    loafs.push(...(list.getEntries() as Loaf[]));
    if (loafs.length > 50) loafs.splice(0, loafs.length - 50);
  }).observe({ type: "long-animation-frame", buffered: true });
}

function flush() {
  if (queue.length === 0) return;
  const body = JSON.stringify({
    formFactor: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    samples: queue.splice(0),
  });
  // sendBeacon survives the page being closed; fetch keepalive is the fallback.
  if (!navigator.sendBeacon?.("/api/vitals", body)) {
    fetch("/api/vitals", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

function onHidden() {
  if (document.visibilityState === "hidden") flush();
}

function describe(el: Node | null) {
  if (!(el instanceof Element)) return "(removed)";
  const href = el.closest("a")?.getAttribute("href");
  return `${el.tagName.toLowerCase()}${href ? `[href=${href}]` : el.id ? `#${el.id}` : ""}`.slice(0, 100);
}

function shortSource(s: LoafScript) {
  const file = s.sourceURL.split("/").pop()?.split("?")[0] || "(inline)";
  return `${s.invoker} ${file}${s.sourceFunctionName ? `:${s.sourceFunctionName}` : ""}`.slice(0, 100);
}

// INP is the slowest interaction. Record each of its events split into the three phases,
// plus the long animation frames that overlapped it: they show which scripts or how much
// rendering kept the next frame from being painted.
function inpAttribution(metric: Metric): InpAttribution | undefined {
  const entries = (metric.entries as PerformanceEventTiming[]).slice().sort((a, b) => a.startTime - b.startTime);
  if (entries.length === 0) return;
  const start = entries[0].startTime;
  const end = Math.max(...entries.map((e) => e.startTime + e.duration));
  const r = Math.round;
  return {
    target: describe(entries.find((e) => e.target)?.target ?? null),
    startTime: r(start),
    events: entries.slice(0, 5).map((e) => ({
      event: e.name,
      duration: r(e.duration),
      inputDelay: r(e.processingStart - e.startTime),
      processing: r(e.processingEnd - e.processingStart),
      presentation: r(e.startTime + e.duration - e.processingEnd),
    })),
    frames: loafs
      .filter((f) => f.startTime < end && f.startTime + f.duration > start)
      .slice(0, 3)
      .map((f) => ({
        duration: r(f.duration),
        blocking: r(f.blockingDuration),
        render: r(f.startTime + f.duration - f.renderStart), // style, layout and paint at the end of the frame
        scripts: f.scripts
          .slice()
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3)
          .map((s) => ({ source: shortSource(s), duration: r(s.duration) })),
      })),
  };
}

// Stable function reference: a new one per render would re-report metrics.
function report(metric: Metric) {
  const key = keyOf(metric);
  if (lastSent.get(key) === metric.value) return;
  lastSent.set(key, metric.value);
  queue.push({
    id: key,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    // Soft navigations can report after the URL changed again; navigationURL pins the page.
    path: new URL(metric.navigationURL ?? location.href).pathname,
    navigation: metric.navigationType,
    attribution: metric.name === "INP" ? inpAttribution(metric) : undefined,
  });
  // Long client-side sessions: send early rather than build one oversized beacon.
  if (queue.length >= MAX_BATCH) flush();
}

export function WebVitals() {
  useReportWebVitals(report);
  // Registered after the hook on purpose: web-vitals reports the final LCP, CLS and INP from
  // its own visibilitychange listener, so ours must run after it or those samples are lost.
  // pagehide covers Safari, which does not always fire visibilitychange on unload.
  useEffect(() => {
    addEventListener("visibilitychange", onHidden);
    addEventListener("pagehide", flush);
    return () => {
      removeEventListener("visibilitychange", onHidden);
      removeEventListener("pagehide", flush);
    };
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];
type InpAttribution = {
  event: string;
  target: string;
  startTime: number; // ms since navigation start: an early tap may be waiting on hydration
  inputDelay: number; // main thread busy before handlers could run
  processing: number; // event handlers themselves
  presentation: number; // rendering the next frame after handlers
};
type Sample = {
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

// INP is the slowest interaction; split its entry into the three phases so field data
// says where to look instead of leaving us to guess.
function inpAttribution(metric: Metric): InpAttribution | undefined {
  const entries = metric.entries as PerformanceEventTiming[];
  const e = entries.reduce<PerformanceEventTiming | undefined>((a, b) => (!a || b.duration > a.duration ? b : a), undefined);
  if (!e) return;
  return {
    event: e.name,
    target: describe(e.target),
    startTime: Math.round(e.startTime),
    inputDelay: Math.round(e.processingStart - e.startTime),
    processing: Math.round(e.processingEnd - e.processingStart),
    presentation: Math.round(e.startTime + e.duration - e.processingEnd),
  };
}

// Stable function reference: a new one per render would re-report metrics.
function report(metric: Metric) {
  queue.push({
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

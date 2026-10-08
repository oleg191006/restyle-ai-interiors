"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];
type Sample = { name: string; value: number; rating: string; path: string; navigation: string };

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

// Stable function reference: a new one per render would re-report metrics.
function report(metric: Metric) {
  queue.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    // Soft navigations can report after the URL changed again; navigationURL pins the page.
    path: new URL(metric.navigationURL ?? location.href).pathname,
    navigation: metric.navigationType,
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

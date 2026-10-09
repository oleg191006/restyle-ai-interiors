"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// One small beacon per page view, instead of an analytics library on every landing page
// (ADR 0012): the server forwards it to PostHog. Only the path is sent, no query string.
export function PageViews() {
  const pathname = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path: pathname, referrer: document.referrer });
    if (!navigator.sendBeacon?.("/api/events", body)) {
      fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [pathname]);
  return null;
}

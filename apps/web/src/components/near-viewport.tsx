"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders its children only once the placeholder comes within `margin` of the viewport.
 *
 * For decorative images below the first screen of the home page. Native lazy loading starts
 * any image within ~1,250 px of the viewport at first layout, so on a short page the gallery
 * downloaded before the hero had painted, and Lighthouse's network model counted those bytes
 * against LCP (ADR 0013). The links and text around the image stay in the server HTML.
 */
export function NearViewport({ children, margin = "300px" }: { children: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return (
    <div ref={ref} className="h-full w-full">
      {near ? children : null}
    </div>
  );
}

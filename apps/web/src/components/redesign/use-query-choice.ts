import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A choice preselected by the query string (?room=&style=) until the person picks.
 *
 * The tool page is prerendered, so the server cannot know the query: it renders the defaults
 * (the server snapshot is ""), and the browser re-renders only the selection once it reads
 * `location.search`. No Suspense fallback is swapped out: that lost a photo picked in the first
 * moments, and an empty fallback shifted the layout (CLS 0.157, ADR 0013).
 */
export function useQueryChoice(key: string, options: { slug: string }[]) {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const [picked, setPicked] = useState<string | null>(null);
  const fromQuery = new URLSearchParams(search).get(key);
  const value = picked ?? (options.some((o) => o.slug === fromQuery) ? fromQuery! : (options[0]?.slug ?? ""));
  return [value, setPicked] as const;
}

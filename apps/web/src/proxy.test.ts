import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const run = (path: string, acceptLanguage?: string) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers: acceptLanguage ? { "accept-language": acceptLanguage } : {} }));

describe("proxy", () => {
  it("lets localized URLs through untouched, so they stay cacheable", () => {
    expect(run("/uk/ideas/kitchen")).toBeUndefined();
    expect(run("/en")).toBeUndefined();
  });

  it("folds mixed case into the lowercase URL with a permanent redirect", () => {
    const res = run("/UK/ideas/Living-Room");
    expect(res?.status).toBe(308);
    expect(res?.headers.get("location")).toBe("http://localhost/uk/ideas/living-room");
  });

  it("sends / to a locale by Accept-Language with a temporary redirect", () => {
    const res = run("/", "en-GB,en;q=0.9,uk;q=0.8");
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("http://localhost/en");
  });

  // Not "de, uk": uk is also the default, so that case passes even if only the first entry is read.
  it("picks the first supported language, not the first listed", () => {
    expect(run("/", "de-DE,en;q=0.9")?.headers.get("location")).toBe("http://localhost/en");
  });

  it("falls back to the default locale and keeps the path", () => {
    expect(run("/ideas/kitchen")?.headers.get("location")).toBe("http://localhost/uk/ideas/kitchen");
  });
});

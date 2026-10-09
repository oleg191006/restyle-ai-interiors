import { describe, expect, it } from "vitest";
import { browserOf, routeTemplate } from "./vitals";

describe("routeTemplate", () => {
  it.each([
    ["/", "/"],
    ["/uk", "/[locale]"],
    ["/en/ideas", "/[locale]/ideas"],
    ["/uk/ideas/kitchen", "/[locale]/ideas/[room]"],
    ["/uk/ideas/kitchen/loft", "/[locale]/ideas/[room]/[style]"],
    ["/en/styles", "/[locale]/styles"],
    ["/en/styles/japandi", "/[locale]/styles/[style]"],
    ["/uk/redesign", "/[locale]/redesign"],
    ["/uk/something-else", "/other"],
  ])("%s → %s", (path, template) => {
    expect(routeTemplate(path)).toBe(template);
  });
});

describe("browserOf", () => {
  it.each([
    // Chrome on iOS is WebKit underneath, so it is "ios", not "chrome".
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1", "ios"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0", "edge"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0", "firefox"],
    ["Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36", "chrome"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15", "safari"],
    ["curl/8.9.1", "other"],
  ])("%s → %s", (ua, browser) => {
    expect(browserOf(ua)).toBe(browser);
  });
});

import { describe, expect, it } from "vitest";
import { alternatesFor, hasLocale, paths } from "./i18n";

describe("alternatesFor", () => {
  it("gives a self canonical, every locale and x-default", () => {
    expect(alternatesFor("en", (l) => paths.idea(l, "kitchen", "loft"))).toEqual({
      canonical: "/en/ideas/kitchen/loft",
      languages: {
        "uk-UA": "/uk/ideas/kitchen/loft",
        en: "/en/ideas/kitchen/loft",
        "x-default": "/uk/ideas/kitchen/loft",
      },
    });
  });
});

describe("paths.redesign", () => {
  it("adds only the parameters that are set", () => {
    expect(paths.redesign("uk")).toBe("/uk/redesign");
    expect(paths.redesign("uk", "kitchen")).toBe("/uk/redesign?room=kitchen");
    expect(paths.redesign("en", "kitchen", "loft")).toBe("/en/redesign?room=kitchen&style=loft");
  });
});

describe("hasLocale", () => {
  it("accepts only supported locales, case-sensitively", () => {
    expect(hasLocale("uk")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("UK")).toBe(false);
    expect(hasLocale("ru")).toBe(false);
  });
});

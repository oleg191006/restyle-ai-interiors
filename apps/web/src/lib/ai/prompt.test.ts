import { describe, expect, it } from "vitest";
import { buildPrompt, currentPromptVersion, prompts } from "./prompt";

const input = { room: "Bathroom", style: "Japandi", materials: ["oak", "linen"], palette: ["warm white", "sand"] };

describe("prompts", () => {
  it("every version names the room, style, materials and palette", () => {
    for (const build of Object.values(prompts)) {
      const p = build(input);
      expect(p).toContain("bathroom");
      expect(p).toContain("Japandi");
      expect(p).toContain("oak, linen");
      expect(p).toContain("warm white, sand");
    }
  });

  it("v3 and later forbid invented openings", () => {
    expect(prompts.v3(input)).toMatch(/Do not add any new doors, windows/);
    expect(prompts.v4(input)).toMatch(/Do not add any windows, doors/);
    expect(prompts.v5(input)).toMatch(/Do not add any windows, doors/);
  });

  // ADR 0006 follow-up: the phrases suspected of adding windows to windowless rooms.
  it.each(["v4", "v5"] as const)("%s neither names a window position nor asks for daylight", (v) => {
    const p = prompts[v](input);
    expect(p).not.toMatch(/window and door positions/);
    expect(p).not.toMatch(/daylight/);
  });

  // v4 eval: "the same walls" kept tiles and backsplash in place.
  it("v5 pins wall positions, not wall surfaces", () => {
    const p = prompts.v5(input);
    expect(p).toMatch(/wall positions/);
    expect(p).not.toMatch(/the same walls/);
    expect(p).toMatch(/tiles and all other wall finishes/);
  });

  // One variable at a time: v6 must differ from v4 in that phrase only.
  it("v6 is v4 with only the wall wording changed", () => {
    const [a, b] = [prompts.v4(input).split(" "), prompts.v6(input).split(" ")];
    expect(b.length).toBe(a.length + 1);
    expect(prompts.v6(input).replace("the same wall positions", "the same walls")).toBe(prompts.v4(input));
  });

  it("buildPrompt uses the production version", () => {
    expect(buildPrompt(input)).toBe(prompts[currentPromptVersion](input));
  });
});

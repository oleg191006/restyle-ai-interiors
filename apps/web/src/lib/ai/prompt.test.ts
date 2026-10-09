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
  });

  // ADR 0006 follow-up: the phrases suspected of adding windows to windowless rooms.
  it("v4 neither names a window position nor asks for daylight", () => {
    const p = prompts.v4(input);
    expect(p).not.toMatch(/window and door positions/);
    expect(p).not.toMatch(/daylight/);
  });

  it("buildPrompt uses the production version", () => {
    expect(buildPrompt(input)).toBe(prompts[currentPromptVersion](input));
  });
});

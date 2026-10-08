import "server-only";
import { cloudflareProvider } from "./cloudflare";
import { fakeProvider } from "./fake";
import type { RedesignProvider } from "./types";

export function getProvider(): RedesignProvider {
  return process.env.AI_PROVIDER === "cloudflare" ? cloudflareProvider : fakeProvider;
}

export function buildPrompt(roomName: string, styleName: string, materials: string[], palette: string[]) {
  return [
    `Redesign this ${roomName.toLowerCase()} in ${styleName} interior style.`,
    `Keep the same room layout, walls, windows, doors and camera angle.`,
    `Replace furniture, decor and finishes. Materials: ${materials.join(", ")}.`,
    `Colour palette: ${palette.join(", ")}.`,
    `Photorealistic interior photograph, natural light.`,
  ].join(" ");
}

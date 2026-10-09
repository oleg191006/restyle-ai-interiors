import "server-only";
import { cloudflareProvider } from "./cloudflare";
import { fakeProvider } from "./fake";
import type { RedesignProvider } from "./types";

export function getProvider(): RedesignProvider {
  return process.env.AI_PROVIDER === "cloudflare" ? cloudflareProvider : fakeProvider;
}

// A vague "replace furniture and finishes" only swapped the sofa; listing what to replace and
// what to keep turned it into a full redesign (compared on the same photo and seed).
export function buildPrompt(roomName: string, styleName: string, materials: string[], palette: string[]) {
  return [
    `Fully redesign this ${roomName.toLowerCase()} in ${styleName} interior style.`,
    "Keep only the architecture: same walls, windows, doors, ceiling height and the exact camera angle.",
    "Replace everything else: wall finishes and wallpaper, flooring, curtains, light fixtures, furniture and decor,",
    "and remove all clutter, papers and personal items.",
    `Use ${materials.join(", ")}.`,
    `Colour palette: ${palette.join(", ")}.`,
    "Photorealistic interior photograph, soft natural daylight, sharp details.",
  ].join(" ");
}

import "server-only";
import sharp from "sharp";
import type { RedesignProvider } from "./types";

// Free stand-in for development and CI: tints the photo with the style's main colour and
// upsizes it like the real model would. Exercises the whole pipeline without spending quota.
export const fakeProvider: RedesignProvider = {
  name: "fake",
  async redesign({ image, palette }) {
    const tint = palette[Math.min(2, palette.length - 1)] ?? "#a98b69";
    await new Promise((r) => setTimeout(r, 1500)); // a model takes a moment; makes polling visible
    const out = await sharp(image).resize({ width: 1024, height: 768, fit: "cover" }).tint(tint).jpeg({ quality: 85 }).toBuffer();
    return { image: out, contentType: "image/jpeg" };
  },
};

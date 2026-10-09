// Prompt evaluation for the redesign model (ADR 0006).
//
//   pnpm --filter web eval:prompts v1 v2
//   pnpm --filter web eval:prompts v3 v4 --rooms=bathroom   (a subset, to spend less quota)
//
// Runs every prompt version on the same photos × styles with the same seed per pair, so only
// the prompt differs. Results are cached in scripts/eval/out, so a re-run costs nothing; delete
// a file to regenerate it. Writes one contact sheet per version for side-by-side review.
// Cost: ~110 neurons per image (FLUX.2 klein 4B, measured: 20 images = 2,160 on the dashboard);
// 4 photos × 4 styles = 16 per version ≈ 1,750.

import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { prompts, type PromptVersion } from "../src/lib/ai/prompt.ts";
import { evalOutDir, promptFor } from "./lib/pairs.ts";
import { ensurePhotos, photoPath } from "./lib/photos.ts";
import { runModel, seedOf, toModelInput } from "./lib/workers-ai.ts";

// bathroom: a windowless room, added after v3 painted windows into it (ADR 0007)
const ALL_ROOMS = ["living-room", "kitchen", "bedroom", "bathroom"];
const args = process.argv.slice(2);
const roomsArg = args.find((a) => a.startsWith("--rooms="))?.slice("--rooms=".length).split(",");
for (const r of roomsArg ?? []) if (!ALL_ROOMS.includes(r)) throw new Error(`Unknown room ${r}; have ${ALL_ROOMS.join(", ")}`);
const ROOMS = roomsArg ?? ALL_ROOMS;
const STYLES = ["scandinavian", "loft", "eclectic", "classic"];

async function evaluate(version: PromptVersion) {
  fs.mkdirSync(path.join(evalOutDir, version), { recursive: true });
  const jobs = ROOMS.flatMap((room) => STYLES.map((style) => ({ room, style })));
  // Two at a time: fast enough, and gentle on the shared daily allowance.
  for (let i = 0; i < jobs.length; i += 2) {
    await Promise.all(
      jobs.slice(i, i + 2).map(async ({ room, style }) => {
        const file = path.join(evalOutDir, version, `${room}--${style}.jpg`);
        if (fs.existsSync(file)) return;
        const t = Date.now();
        const image = await runModel(promptFor(version, room, style), await toModelInput(photoPath(room)), seedOf(`${room}:${style}`));
        fs.writeFileSync(file, image);
        console.log(`${version} ${room} × ${style}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
      }),
    );
  }
}

const W = 320;
const H = 240;
const LABEL = 32;
const label = (text: string, w: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${LABEL}"><rect width="100%" height="100%" fill="#1c1a17"/><text x="8" y="22" font-family="sans-serif" font-size="16" fill="#fbfaf8">${text}</text></svg>`,
  );

async function contactSheet(version: PromptVersion) {
  const cols = ["before", ...STYLES];
  const width = W * cols.length;
  const height = LABEL + ROOMS.length * (H + LABEL);
  const layers: OverlayOptions[] = cols.map((c, i) => ({ input: label(c, W), left: i * W, top: 0 }));
  for (const [row, room] of ROOMS.entries()) {
    const top = LABEL + row * (H + LABEL);
    layers.push({ input: label(`${room}  (${version})`, width), left: 0, top });
    for (const [col, c] of cols.entries()) {
      const file = c === "before" ? photoPath(room) : path.join(evalOutDir, version, `${room}--${c}.jpg`);
      layers.push({ input: await sharp(file).resize(W, H, { fit: "cover" }).toBuffer(), left: col * W, top: top + LABEL });
    }
  }
  const out = path.join(evalOutDir, `${version}-sheet${roomsArg ? `-${ROOMS.join("+")}` : ""}.jpg`);
  await sharp({ create: { width, height, channels: 3, background: "#1c1a17" } }).composite(layers).jpeg({ quality: 82 }).toFile(out);
  console.log(`sheet: ${out}`);
}

const named = args.filter((a) => !a.startsWith("--"));
const versions = (named.length ? named : Object.keys(prompts)) as PromptVersion[];
for (const v of versions) if (!(v in prompts)) throw new Error(`Unknown prompt version ${v}; have ${Object.keys(prompts).join(", ")}`);
await ensurePhotos(ROOMS);
for (const v of versions) {
  await evaluate(v);
  await contactSheet(v);
}

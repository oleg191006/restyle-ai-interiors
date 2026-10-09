// Prompt evaluation for the redesign model (ADR 0005).
//
//   pnpm --filter web eval:prompts v1 v2
//
// Runs every prompt version on the same photos × styles with the same seed per pair, so only
// the prompt differs. Results are cached in scripts/eval/out, so a re-run costs nothing; delete
// a file to regenerate it. Writes one contact sheet per version for side-by-side review.
// Cost: ~160 neurons per image (FLUX.2 klein 4B); 3 photos × 4 styles = 12 per version.

import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { rooms, styles } from "../../../packages/db/src/seed-data.ts";
import { prompts, type PromptVersion } from "../src/lib/ai/prompt.ts";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const ROOMS = ["living-room", "kitchen", "bedroom"];
const STYLES = ["scandinavian", "loft", "eclectic", "classic"];

// Realistic "before" photos, generated once from text and then kept in the repo, so every
// evaluation starts from exactly the same inputs.
const PHOTO_PROMPTS: Record<string, string> = {
  "living-room":
    "Realistic smartphone photo of an ordinary dated living room in a Ukrainian apartment: beige wallpaper, old brown sofa, wooden wall unit, patterned carpet, one window with plain curtains, ceiling lamp, slightly cluttered, daylight, eye-level wide shot",
  kitchen:
    "Realistic smartphone photo of an ordinary dated small kitchen in a Ukrainian apartment: worn light-wood cabinets, beige tiled backsplash, old gas stove, fridge with magnets, small table with oilcloth and two stools, window with lace curtain, dishes and jars on the counter, daylight, eye-level wide shot",
  bedroom:
    "Realistic smartphone photo of an ordinary dated bedroom in a Ukrainian apartment: green patterned wallpaper, old double bed with floral blanket, polished wooden wardrobe, rug on the wall, small bedside table with lamp, window with heavy curtains, clothes on a chair, daylight, eye-level wide shot",
};

const dir = path.join(import.meta.dirname, "eval");
const photoDir = path.join(dir, "photos");
const outDir = path.join(dir, "out");

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_AI_TOKEN;
if (!accountId || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN (apps/web/.env.local)");

async function run(prompt: string, image: Buffer | null, seed: number) {
  const form = new FormData();
  form.append("prompt", prompt);
  if (image) form.append("input_image_0", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), "room.jpg");
  form.append("width", "1024");
  form.append("height", "768");
  form.append("seed", String(seed));
  if (image) form.append("guidance", "7"); // same as production (lib/ai/cloudflare.ts)
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; result?: { image?: string }; errors?: unknown };
    if (res.ok && json.result?.image) return Buffer.from(json.result.image, "base64");
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    throw new Error(`Workers AI ${res.status}: ${JSON.stringify(json.errors)}`);
  }
}

// Same pair, same seed in every version, so differences come from the prompt alone.
const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1_000_000;

// Same preprocessing as the browser (components/redesign-tool.tsx): long side 504 px, JPEG.
const toModelInput = (file: string) =>
  sharp(file).resize({ width: 504, height: 504, fit: "inside" }).jpeg({ quality: 90 }).toBuffer();

async function ensurePhotos() {
  fs.mkdirSync(photoDir, { recursive: true });
  for (const room of ROOMS) {
    const file = path.join(photoDir, `${room}.jpg`);
    if (fs.existsSync(file)) continue;
    console.log(`generating base photo: ${room}`);
    fs.writeFileSync(file, await run(PHOTO_PROMPTS[room], null, seedOf(`photo:${room}`)));
  }
}

async function evaluate(version: PromptVersion) {
  fs.mkdirSync(path.join(outDir, version), { recursive: true });
  const jobs = ROOMS.flatMap((room) => STYLES.map((style) => ({ room, style })));
  // Two at a time: fast enough, and gentle on the shared daily allowance.
  for (let i = 0; i < jobs.length; i += 2) {
    await Promise.all(
      jobs.slice(i, i + 2).map(async ({ room, style }) => {
        const file = path.join(outDir, version, `${room}--${style}.jpg`);
        if (fs.existsSync(file)) return;
        const r = rooms.find((x) => x.slug === room)!;
        const s = styles.find((x) => x.slug === style)!;
        const prompt = prompts[version]({
          room: r.name.en,
          style: s.name.en,
          materials: s.materials.map((m) => m.en),
          palette: s.palette,
        });
        const t = Date.now();
        fs.writeFileSync(file, await run(prompt, await toModelInput(path.join(photoDir, `${room}.jpg`)), seedOf(`${room}:${style}`)));
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
      const file = c === "before" ? path.join(photoDir, `${room}.jpg`) : path.join(outDir, version, `${room}--${c}.jpg`);
      layers.push({ input: await sharp(file).resize(W, H, { fit: "cover" }).toBuffer(), left: col * W, top: top + LABEL });
    }
  }
  const out = path.join(outDir, `${version}-sheet.jpg`);
  await sharp({ create: { width, height, channels: 3, background: "#1c1a17" } }).composite(layers).jpeg({ quality: 82 }).toFile(out);
  console.log(`sheet: ${out}`);
}

const versions = (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(prompts)) as PromptVersion[];
for (const v of versions) if (!(v in prompts)) throw new Error(`Unknown prompt version ${v}; have ${Object.keys(prompts).join(", ")}`);

await ensurePhotos();
for (const v of versions) {
  await evaluate(v);
  await contactSheet(v);
}

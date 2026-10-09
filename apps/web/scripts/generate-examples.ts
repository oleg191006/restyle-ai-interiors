// Before/after examples for the landing pages: the unique content each room × style page needs
// (docs/learn/04, ADR 0007).
//
//   pnpm --filter web examples:generate            # up to 20 new images
//   pnpm --filter web examples:generate --limit 60
//
// Incremental and resumable: pairs go in order of search demand (room × style priority),
// existing ones are skipped, and the production prompt's eval results are reused for free.
// ~160 neurons per new image, from the same daily allowance as production.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { currentPromptVersion } from "../src/lib/ai/prompt.ts";
import { evalOutDir, promptFor, rooms, styles } from "./lib/pairs.ts";
import { ensurePhotos, photoPath } from "./lib/photos.ts";
import { runModel, seedOf, toModelInput } from "./lib/workers-ai.ts";

// `rejected` is set by hand after review; such pairs are kept here so they are not regenerated.
type Manifest = Record<string, { promptVersion: string; generatedAt: string; rejected?: string }>;

const publicDir = path.join(import.meta.dirname, "..", "public", "examples");
const manifestPath = path.join(import.meta.dirname, "..", "src", "data", "examples.json");

// Rooms whose examples fail review for a known prompt problem; skipped until it is fixed,
// so the generator does not spend the allowance on images that will be rejected.
const HOLD_ROOMS: Record<string, string> = {
  bathroom: "v3 adds a window to the windowless bathroom photo (3 of 3 rejected); add it to the eval set first",
};

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 20;

// 1024×768 WebP at q78 is ~60–90 KB; next/image serves smaller AVIF/WebP variants from it.
const publish = (input: Buffer | string, file: string) =>
  sharp(input).resize(1024, 768, { fit: "cover" }).webp({ quality: 78 }).toFile(path.join(publicDir, file));

const manifest: Manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const save = () => {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
};

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

const pairs = rooms
  .flatMap((r) => styles.map((s) => ({ room: r.slug, style: s.slug, score: r.priority * s.priority })))
  .sort((a, b) => b.score - a.score)
  .filter(({ room, style }) => !manifest[`${room}--${style}`] && !HOLD_ROOMS[room]);

for (const [room, why] of Object.entries(HOLD_ROOMS)) console.log(`on hold: ${room} (${why})`);

const today = new Date().toISOString().slice(0, 10);
let generated = 0;
let reused = 0;

for (const { room, style } of pairs) {
  const key = `${room}--${style}`;
  const cached = path.join(evalOutDir, currentPromptVersion, `${key}.jpg`);
  if (fs.existsSync(cached)) {
    reused++;
  } else if (generated >= limit) {
    continue; // keep looking for free eval results, but spend nothing more
  } else {
    await ensurePhotos([room]);
    generated++;
  }

  if (!fs.existsSync(path.join(publicDir, `${room}--before.webp`))) await publish(photoPath(room), `${room}--before.webp`);
  const image = fs.existsSync(cached)
    ? fs.readFileSync(cached)
    : await runModel(promptFor(currentPromptVersion, room, style), await toModelInput(photoPath(room)), seedOf(`${room}:${style}`));
  await publish(image, `${key}.webp`);
  manifest[key] = { promptVersion: currentPromptVersion, generatedAt: today };
  save(); // after every image, so an interrupted run keeps its progress
  console.log(`${fs.existsSync(cached) ? "reused  " : "generated"} ${key}`);
}

const total = rooms.length * styles.length;
const rejected = Object.values(manifest).filter((e) => e.rejected).length;
console.log(
  `\n${generated} generated, ${reused} reused from eval; ${Object.keys(manifest).length - rejected} / ${total} published, ${rejected} rejected`,
);
console.log('Review every new image before committing; mark bad ones with "rejected" in src/data/examples.json.');

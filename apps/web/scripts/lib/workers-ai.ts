// Shared by the eval and example scripts: one Workers AI call with the production settings.
import sharp from "sharp";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

export async function runModel(prompt: string, image: Buffer | null, seed: number) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN (apps/web/.env.local)");

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
    const json = (await res.json().catch(() => ({}))) as { result?: { image?: string }; errors?: unknown };
    if (res.ok && json.result?.image) return Buffer.from(json.result.image, "base64");
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    throw new Error(`Workers AI ${res.status}: ${JSON.stringify(json.errors)}`);
  }
}

// Same pair, same seed everywhere, so eval results and published examples are reproducible.
export const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1_000_000;

// Same preprocessing as the browser (components/redesign/prepare-photo.ts): long side 504 px, JPEG.
export const toModelInput = (file: string) =>
  sharp(file).resize({ width: 504, height: 504, fit: "inside" }).jpeg({ quality: 90 }).toBuffer();

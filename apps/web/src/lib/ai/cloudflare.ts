import "server-only";
import { env } from "../env";
import { PermanentError, type RedesignProvider } from "./types";

// FLUX.2 [klein] 4B on Workers AI: edits from a reference image (input_image_0), fixed
// 4 steps, ~160 neurons per 1024×768 edit, so ~60 a day on the free allowance (ADR 0005).
const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

export const cloudflareProvider: RedesignProvider = {
  name: "cloudflare",
  async redesign({ image, prompt }) {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("input_image_0", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), "room.jpg");
    form.append("width", "1024");
    form.append("height", "768");

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("CLOUDFLARE_AI_TOKEN")}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    // 429 and 5xx are worth retrying; other 4xx mean the request itself is wrong.
    if (res.status === 429 || res.status >= 500) throw new Error(`Workers AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { success?: boolean; result?: { image?: string }; errors?: { message: string }[] };
    if (!res.ok || !json.success || !json.result?.image) {
      throw new PermanentError(`Workers AI ${res.status}: ${json.errors?.map((e) => e.message).join("; ") ?? "no image"}`);
    }
    const out = Buffer.from(json.result.image, "base64");
    // The docs only say "base64 image"; sniff the format instead of assuming it.
    const contentType = out[0] === 0x89 && out[1] === 0x50 ? "image/png" : "image/jpeg";
    return { image: out, contentType };
  },
};

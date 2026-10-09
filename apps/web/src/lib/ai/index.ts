import "server-only";
import { cloudflareProvider } from "./cloudflare";
import { fakeProvider } from "./fake";
import type { RedesignProvider } from "./types";

export function getProvider(): RedesignProvider {
  return process.env.AI_PROVIDER === "cloudflare" ? cloudflareProvider : fakeProvider;
}

export { buildPrompt, currentPromptVersion } from "./prompt";

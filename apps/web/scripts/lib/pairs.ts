// Room × style pairs and their prompts, shared by the eval and the example generator.
import path from "node:path";
import { rooms, styles } from "../../../../packages/db/src/seed-data.ts";
import { prompts, type PromptVersion } from "../../src/lib/ai/prompt.ts";

export { rooms, styles };

/** Cached eval results; the example generator reuses them instead of paying twice. */
export const evalOutDir = path.join(import.meta.dirname, "..", "eval", "out");

export function promptFor(version: PromptVersion, room: string, style: string) {
  const r = rooms.find((x) => x.slug === room);
  const s = styles.find((x) => x.slug === style);
  if (!r || !s) throw new Error(`Unknown pair ${room} × ${style}`);
  return prompts[version]({ room: r.name.en, style: s.name.en, materials: s.materials.map((m) => m.en), palette: s.palette });
}

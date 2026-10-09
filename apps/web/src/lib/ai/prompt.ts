// Versioned redesign prompts. No imports, so `scripts/eval-prompts.ts` can run them as is.
// Compare versions on the fixed photo set before switching `currentPrompt` (see docs/adr/0005).

export type PromptInput = { room: string; style: string; materials: string[]; palette: string[] };

/** v1: says what to keep and what to replace. Left wallpaper and old cabinets in some styles. */
export function promptV1({ room, style, materials, palette }: PromptInput) {
  return [
    `Fully redesign this ${room.toLowerCase()} in ${style} interior style.`,
    "Keep only the architecture: same walls, windows, doors, ceiling height and the exact camera angle.",
    "Replace everything else: wall finishes and wallpaper, flooring, curtains, light fixtures, furniture and decor,",
    "and remove all clutter, papers and personal items.",
    `Use ${materials.join(", ")}.`,
    `Colour palette: ${palette.join(", ")}.`,
    "Photorealistic interior photograph, soft natural daylight, sharp details.",
  ].join(" ");
}

/**
 * v2: two explicit steps, empty the room then furnish it, and names the things v1 left
 * behind (wallpaper, cabinets and shelving units, objects on surfaces).
 */
export function promptV2({ room, style, materials, palette }: PromptInput) {
  const r = room.toLowerCase();
  return [
    `Interior redesign of this ${r}.`,
    "Keep the architecture exactly: the same walls, window and door positions, ceiling, radiators and the exact camera angle and perspective.",
    "First remove everything currently in the room: all furniture, cabinets and shelving units, wallpaper and wall finishes, curtains, rugs, lamps, decor and every object on tables and shelves.",
    "Nothing from the original furnishing may remain.",
    `Then furnish it as a ${style} ${r}:`,
    `new wall finish typical of ${style} style, new flooring, new furniture, lighting, textiles and a few decor pieces,`,
    `using ${materials.join(", ")},`,
    `in a ${palette.join(", ")} colour palette.`,
    "Tidy, styled like a professional interior magazine photo, photorealistic, natural daylight, sharp details.",
  ].join(" ");
}

// What "everything" means in each room. Without it the model kept kitchen cabinets and
// bedding and only recoloured them (v2 eval).
const roomItems: Record<string, string> = {
  "living room": "sofa, armchairs, wall units, shelving, coffee table, rugs",
  bedroom: "bed frame, bedding, wardrobe, bedside tables, rugs, anything hung on the walls",
  kitchen: "cabinet fronts, countertops, backsplash, dining table, chairs and tablecloth",
  bathroom: "tiles, vanity, mirror, bath or shower screen, towels",
  "kids' room": "bed, storage, desk, rugs, toys on the floor",
  "home office": "desk, chair, shelving, storage",
  "dining room": "dining table, chairs, sideboard, rugs",
  hallway: "storage, coat rack, mirror, rugs, shoes on the floor",
};

/**
 * v3: v2 plus the fixes from its eval. v2 replaced removed wardrobes with doors that did
 * not exist, so openings are pinned explicitly; and it names the room-specific items.
 */
export function promptV3({ room, style, materials, palette }: PromptInput) {
  const r = room.toLowerCase();
  return [
    `Interior redesign of this ${r}.`,
    "Keep the architecture exactly: the same walls, window and door positions, ceiling, radiators and the exact camera angle and perspective.",
    "Do not add any new doors, windows, openings or wall panels; where furniture is removed, the wall behind it stays a plain wall.",
    `First remove everything currently in the room: wallpaper and wall finishes, curtains, lamps, ${roomItems[r] ?? "furniture, storage, rugs"}, decor and every object on tables and shelves.`,
    "Nothing from the original furnishing may remain.",
    `Then furnish it as a ${style} ${r}:`,
    `new wall finish typical of ${style} style, new flooring, new furniture, lighting, textiles and a few decor pieces,`,
    `using ${materials.join(", ")},`,
    `in a ${palette.join(", ")} colour palette.`,
    "Tidy, styled like a professional interior magazine photo, photorealistic, natural daylight, sharp details.",
  ].join(" ");
}

export const prompts = { v1: promptV1, v2: promptV2, v3: promptV3 } as const;
export type PromptVersion = keyof typeof prompts;

/** The version used in production. Change only after it wins on the eval set. */
export const currentPromptVersion: PromptVersion = "v3";
export const buildPrompt = (input: PromptInput) => prompts[currentPromptVersion](input);

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

/**
 * v4: v3 added a window to all three windowless bathrooms (ADR 0007). Two v3 phrases likely
 * invite it: "the same walls, window and door positions" names a window even when there is
 * none, and "natural daylight" needs a light source. v4 only refers to openings that exist in
 * the photo and asks for lighting consistent with it. To be confirmed on the eval set with a
 * windowless room.
 */
export function promptV4({ room, style, materials, palette }: PromptInput) {
  const r = room.toLowerCase();
  return [
    `Interior redesign of this ${r}.`,
    "Keep the architecture exactly as it is in the photo: the same walls, ceiling, the doors and windows that are already visible (and no others), radiators, and the exact camera angle and perspective.",
    "Do not add any windows, doors, openings or wall panels that are not in the photo; if the photo shows no window, the room has no window. Where furniture is removed, the wall behind it stays a plain wall.",
    `First remove everything currently in the room: wallpaper and wall finishes, curtains, lamps, ${roomItems[r] ?? "furniture, storage, rugs"}, decor and every object on tables and shelves.`,
    "Nothing from the original furnishing may remain.",
    `Then furnish it as a ${style} ${r}:`,
    `new wall finish typical of ${style} style, new flooring, new furniture, lighting, textiles and a few decor pieces,`,
    `using ${materials.join(", ")},`,
    `in a ${palette.join(", ")} colour palette.`,
    "Tidy, styled like a professional interior magazine photo, photorealistic, sharp details, lighting consistent with the original photo.",
  ].join(" ");
}

/**
 * v5: v4 fixed the invented windows (bathroom 4 → 1) but left the Scandinavian kitchen and
 * bathroom almost untouched: tiles, backsplash and cabinet fronts stayed. v4 says "keep the
 * architecture exactly as it is in the photo: the same walls", which reads as "keep the walls
 * as they are" and contradicts "remove wall finishes, tiles, backsplash". v3 said "wall
 * positions". v5 keeps v4's opening rules and pins the room shape, not the wall surfaces.
 * Eval: rejected. Windows came back in 3 of 4 bathrooms, the loft kitchen got a different
 * window, and the Scandinavian kitchen still kept its cabinets.
 */
export function promptV5({ room, style, materials, palette }: PromptInput) {
  const r = room.toLowerCase();
  return [
    `Interior redesign of this ${r}.`,
    "Keep the architecture: the same room shape and wall positions, ceiling, the doors and windows that are already visible (and no others), radiators, and the exact camera angle and perspective.",
    "Do not add any windows, doors, openings or wall panels that are not in the photo; if the photo shows no window, the room has no window. Where furniture is removed, the wall behind it stays a plain wall.",
    `First remove everything currently in the room: wallpaper, tiles and all other wall finishes, curtains, lamps, ${roomItems[r] ?? "furniture, storage, rugs"}, decor and every object on tables and shelves.`,
    "Nothing from the original finishes or furnishing may remain.",
    `Then furnish it as a ${style} ${r}:`,
    `new wall finish typical of ${style} style, new flooring, new furniture, lighting, textiles and a few decor pieces,`,
    `using ${materials.join(", ")},`,
    `in a ${palette.join(", ")} colour palette.`,
    "Tidy, styled like a professional interior magazine photo, photorealistic, sharp details, lighting consistent with the original photo.",
  ].join(" ");
}

/**
 * v6: v5 changed three things at once and brought the windows back (bathroom 3 of 4), so its
 * result says nothing about any single change. v6 is v4 with exactly one edit: "the same
 * walls" → "the same wall positions". "Exactly as it is in the photo", which likely holds the
 * windows back, stays.
 * Eval: rejected. Windows came back in 3 of 4 bathrooms (v4: 1) and the kitchen scored the same
 * as v4 (16 / 20; the Scandinavian one still keeps its cabinets). So "the same walls" alone is
 * what holds the windows back, and it is not why the Scandinavian kitchen barely changes.
 */
export function promptV6(input: PromptInput) {
  return promptV4(input).replace("the same walls, ceiling", "the same wall positions, ceiling");
}

/**
 * v7: v6 showed that "the same walls" holds invented windows back and is not why Scandinavian
 * rooms barely change: their original photos already look close to the style, and the model
 * keeps what already fits. v7 is v4 plus one sentence saying that such pieces are replaced too.
 * Eval: no effect. Same scores as v4 (bathroom 17, 1 window; kitchen 16), and the Scandinavian
 * kitchen still keeps its cabinets. The eclectic kitchen got better and the classic one worse,
 * which with one seed per pair is noise. Text does not move it; production stays on v4.
 */
export const V7_SENTENCE = "Even pieces that already look close to the new style are replaced with new ones.";
export function promptV7(input: PromptInput) {
  return promptV4(input).replace("Nothing from the original furnishing may remain.", `Nothing from the original furnishing may remain. ${V7_SENTENCE}`);
}

export const prompts = { v1: promptV1, v2: promptV2, v3: promptV3, v4: promptV4, v5: promptV5, v6: promptV6, v7: promptV7 } as const;
export type PromptVersion = keyof typeof prompts;

/**
 * The version used in production. Change only after it wins on the eval set.
 * v4: ties v3 on score but invents 1 window in 4 windowless bathrooms against v3's 4 (ADR 0006).
 */
export const currentPromptVersion: PromptVersion = "v4";
export const buildPrompt = (input: PromptInput) => prompts[currentPromptVersion](input);

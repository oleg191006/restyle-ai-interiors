// "Before" photos, one per room type, generated once from text and kept in the repo so the
// eval and the published examples always start from the same inputs.
import fs from "node:fs";
import path from "node:path";
import { runModel, seedOf } from "./workers-ai.ts";

export const photoDir = path.join(import.meta.dirname, "..", "photos");

const PHOTO_PROMPTS: Record<string, string> = {
  "living-room":
    "Realistic smartphone photo of an ordinary dated living room in a Ukrainian apartment: beige wallpaper, old brown sofa, wooden wall unit, patterned carpet, one window with plain curtains, ceiling lamp, slightly cluttered, daylight, eye-level wide shot",
  kitchen:
    "Realistic smartphone photo of an ordinary dated small kitchen in a Ukrainian apartment: worn light-wood cabinets, beige tiled backsplash, old gas stove, fridge with magnets, small table with oilcloth and two stools, window with lace curtain, dishes and jars on the counter, daylight, eye-level wide shot",
  bedroom:
    "Realistic smartphone photo of an ordinary dated bedroom in a Ukrainian apartment: green patterned wallpaper, old double bed with floral blanket, polished wooden wardrobe, rug on the wall, small bedside table with lamp, window with heavy curtains, clothes on a chair, daylight, eye-level wide shot",
  bathroom:
    "Realistic smartphone photo of an ordinary dated small bathroom in a Ukrainian apartment: blue square tiles, white bathtub with plastic curtain, old sink with mirror cabinet, washing machine, towels on hooks, bottles on the shelf, daylight from ceiling lamp, eye-level wide shot",
  "kids-room":
    "Realistic smartphone photo of an ordinary dated kids' room in a Ukrainian apartment: pastel wallpaper with cartoon print, single bed with bright blanket, old wooden desk and chair, toys on the floor, wardrobe, window with curtains, daylight, eye-level wide shot",
  "home-office":
    "Realistic smartphone photo of an ordinary dated small home office corner in a Ukrainian apartment: beige wallpaper, old computer desk with monitor, office chair, bookshelf with folders, cables, window with blinds, paper stacks, daylight, eye-level wide shot",
  "dining-room":
    "Realistic smartphone photo of an ordinary dated dining room in a Ukrainian apartment: floral wallpaper, heavy wooden table with tablecloth, six old chairs, glass cabinet with dishes, chandelier, window with curtains, daylight, eye-level wide shot",
  hallway:
    "Realistic smartphone photo of an ordinary dated narrow hallway in a Ukrainian apartment: brown wallpaper, old wooden coat rack with jackets, shoes on the floor, mirror, front door, linoleum floor, ceiling lamp, eye-level wide shot",
};

export const photoPath = (room: string) => path.join(photoDir, `${room}.jpg`);

export async function ensurePhotos(rooms: string[]) {
  fs.mkdirSync(photoDir, { recursive: true });
  for (const room of rooms) {
    if (fs.existsSync(photoPath(room))) continue;
    if (!PHOTO_PROMPTS[room]) throw new Error(`No photo prompt for ${room}`);
    console.log(`generating base photo: ${room}`);
    fs.writeFileSync(photoPath(room), await runModel(PHOTO_PROMPTS[room], null, seedOf(`photo:${room}`)));
  }
}

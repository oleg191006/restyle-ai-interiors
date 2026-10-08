// Source data for programmatic pages: rooms × styles × locales.
// Each style carries its own palette and materials so every combination page has unique content.

export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];

type L10n = Record<Locale, string>;

export interface RoomSeed {
  slug: string;
  name: L10n;
  intro: L10n;
  priority: number; // higher = more search demand, prerendered at build
}

export interface StyleSeed {
  slug: string;
  name: L10n;
  summary: L10n;
  palette: string[]; // hex
  materials: L10n[];
  priority: number;
}

export const rooms: RoomSeed[] = [
  {
    slug: "living-room",
    name: { uk: "Вітальня", en: "Living room" },
    intro: {
      uk: "Вітальня — головна спільна зона дому, тут стиль помітний найбільше.",
      en: "The living room is the shared heart of the home, where style shows the most.",
    },
    priority: 10,
  },
  {
    slug: "bedroom",
    name: { uk: "Спальня", en: "Bedroom" },
    intro: {
      uk: "У спальні важать спокійні кольори, м'яке світло й текстиль.",
      en: "In a bedroom, calm colours, soft light and textiles matter most.",
    },
    priority: 9,
  },
  {
    slug: "kitchen",
    name: { uk: "Кухня", en: "Kitchen" },
    intro: {
      uk: "Кухня поєднує функцію й стиль: фасади, стільниця, фартух і світло.",
      en: "A kitchen balances function and style: fronts, worktop, backsplash and lighting.",
    },
    priority: 9,
  },
  {
    slug: "bathroom",
    name: { uk: "Ванна кімната", en: "Bathroom" },
    intro: {
      uk: "У ванній стиль задають плитка, сантехніка й вологостійкі матеріали.",
      en: "In a bathroom, tiles, fixtures and moisture-proof materials set the style.",
    },
    priority: 8,
  },
  {
    slug: "kids-room",
    name: { uk: "Дитяча", en: "Kids' room" },
    intro: {
      uk: "Дитяча має рости разом із дитиною: безпечні матеріали та гнучке зонування.",
      en: "A kids' room should grow with the child: safe materials and flexible zoning.",
    },
    priority: 6,
  },
  {
    slug: "home-office",
    name: { uk: "Домашній кабінет", en: "Home office" },
    intro: {
      uk: "Кабінет — це фокус: робоче світло, ергономіка й мінімум візуального шуму.",
      en: "A home office is about focus: task lighting, ergonomics and little visual noise.",
    },
    priority: 7,
  },
  {
    slug: "dining-room",
    name: { uk: "Їдальня", en: "Dining room" },
    intro: {
      uk: "Їдальня збирається навколо столу: його форма й світильник над ним задають тон.",
      en: "A dining room centres on the table: its shape and the light above it set the tone.",
    },
    priority: 5,
  },
  {
    slug: "hallway",
    name: { uk: "Передпокій", en: "Hallway" },
    intro: {
      uk: "Передпокій — перше враження від дому: зберігання, дзеркало й зносостійка підлога.",
      en: "A hallway is the first impression: storage, a mirror and hard-wearing floors.",
    },
    priority: 4,
  },
];

export const styles: StyleSeed[] = [
  {
    slug: "scandinavian",
    name: { uk: "Скандинавський", en: "Scandinavian" },
    summary: {
      uk: "Світлі стіни, натуральне дерево й функціональні меблі без зайвого декору.",
      en: "Light walls, natural wood and functional furniture without excess decor.",
    },
    palette: ["#F4F1EC", "#D9D3C7", "#A89F91", "#3E3A36"],
    materials: [
      { uk: "світлий дуб", en: "light oak" },
      { uk: "вовна", en: "wool" },
      { uk: "льон", en: "linen" },
    ],
    priority: 10,
  },
  {
    slug: "japandi",
    name: { uk: "Джапанді", en: "Japandi" },
    summary: {
      uk: "Поєднання скандинавського затишку та японського мінімалізму з приглушеними тонами.",
      en: "Scandinavian comfort meets Japanese minimalism in muted, earthy tones.",
    },
    palette: ["#EDE6DB", "#C2B280", "#7A6A53", "#2F2A24"],
    materials: [
      { uk: "ясен", en: "ash wood" },
      { uk: "рисовий папір", en: "rice paper" },
      { uk: "кераміка", en: "ceramics" },
    ],
    priority: 9,
  },
  {
    slug: "minimalist",
    name: { uk: "Мінімалізм", en: "Minimalist" },
    summary: {
      uk: "Мінімум предметів, чисті лінії та приховане зберігання.",
      en: "Few objects, clean lines and hidden storage.",
    },
    palette: ["#FFFFFF", "#E5E5E5", "#9E9E9E", "#1C1C1C"],
    materials: [
      { uk: "матовий лак", en: "matte lacquer" },
      { uk: "мікроцемент", en: "microcement" },
      { uk: "скло", en: "glass" },
    ],
    priority: 9,
  },
  {
    slug: "modern",
    name: { uk: "Сучасний", en: "Modern" },
    summary: {
      uk: "Прості форми, контрастні акценти та технологічні матеріали.",
      en: "Simple forms, contrasting accents and contemporary materials.",
    },
    palette: ["#F2F2F2", "#BDBDBD", "#4F4F4F", "#C17C4A"],
    materials: [
      { uk: "метал", en: "metal" },
      { uk: "кварц", en: "quartz" },
      { uk: "оксамит", en: "velvet" },
    ],
    priority: 8,
  },
  {
    slug: "loft",
    name: { uk: "Лофт", en: "Industrial loft" },
    summary: {
      uk: "Цегла, бетон і відкриті комунікації в просторому інтер'єрі.",
      en: "Brick, concrete and exposed services in an open space.",
    },
    palette: ["#D6D2CD", "#8C5A3C", "#4A4A48", "#1F1F1F"],
    materials: [
      { uk: "цегла", en: "brick" },
      { uk: "бетон", en: "concrete" },
      { uk: "чорний метал", en: "black steel" },
    ],
    priority: 8,
  },
  {
    slug: "mid-century-modern",
    name: { uk: "Мідсенчурі", en: "Mid-century modern" },
    summary: {
      uk: "Меблі на тонких ніжках, горіх і насичені кольори 1950–60-х.",
      en: "Tapered legs, walnut and saturated colours of the 1950s–60s.",
    },
    palette: ["#F1E3C6", "#D98E3A", "#2F6F6A", "#5B3A29"],
    materials: [
      { uk: "горіх", en: "walnut" },
      { uk: "тикове дерево", en: "teak" },
      { uk: "латунь", en: "brass" },
    ],
    priority: 7,
  },
  {
    slug: "boho",
    name: { uk: "Бохо", en: "Boho" },
    summary: {
      uk: "Шари текстилю, ротанг, рослини й теплі землисті кольори.",
      en: "Layered textiles, rattan, plants and warm earthy colours.",
    },
    palette: ["#F3E9DC", "#D8A47F", "#8F5E3B", "#5A7D5A"],
    materials: [
      { uk: "ротанг", en: "rattan" },
      { uk: "макраме", en: "macramé" },
      { uk: "джут", en: "jute" },
    ],
    priority: 7,
  },
  {
    slug: "classic",
    name: { uk: "Класичний", en: "Classic" },
    summary: {
      uk: "Симетрія, молдинги, благородні матеріали й стримана палітра.",
      en: "Symmetry, mouldings, fine materials and a restrained palette.",
    },
    palette: ["#F7F3EA", "#D8CBB0", "#8A7F6C", "#2B2B3A"],
    materials: [
      { uk: "мармур", en: "marble" },
      { uk: "ліпнина", en: "plaster mouldings" },
      { uk: "шовк", en: "silk" },
    ],
    priority: 6,
  },
  {
    slug: "neoclassical",
    name: { uk: "Неокласика", en: "Neoclassical" },
    summary: {
      uk: "Класичні пропорції в сучасному прочитанні, без надмірного декору.",
      en: "Classical proportions read in a modern way, without heavy ornament.",
    },
    palette: ["#F5F2EE", "#CFC6BA", "#7F8C8D", "#2E3A46"],
    materials: [
      { uk: "мармур", en: "marble" },
      { uk: "латунь", en: "brass" },
      { uk: "оксамит", en: "velvet" },
    ],
    priority: 5,
  },
  {
    slug: "art-deco",
    name: { uk: "Ар-деко", en: "Art deco" },
    summary: {
      uk: "Геометрія, глянець, золото й глибокі коштовні кольори.",
      en: "Geometry, gloss, gold and deep jewel tones.",
    },
    palette: ["#0F3B3A", "#1B1B2F", "#C9A227", "#EFE6D8"],
    materials: [
      { uk: "латунь", en: "brass" },
      { uk: "лакове дерево", en: "lacquered wood" },
      { uk: "оксамит", en: "velvet" },
    ],
    priority: 5,
  },
  {
    slug: "coastal",
    name: { uk: "Прибережний", en: "Coastal" },
    summary: {
      uk: "Білий, пісочний і блакитний, природні фактури й багато світла.",
      en: "White, sand and blue, natural textures and plenty of light.",
    },
    palette: ["#FFFFFF", "#E8DCC4", "#9CC3D5", "#2E5E7E"],
    materials: [
      { uk: "вибілене дерево", en: "whitewashed wood" },
      { uk: "льон", en: "linen" },
      { uk: "морська трава", en: "seagrass" },
    ],
    priority: 4,
  },
  {
    slug: "farmhouse",
    name: { uk: "Фермерський", en: "Farmhouse" },
    summary: {
      uk: "Грубе дерево, відкриті полиці та домашній сільський затишок.",
      en: "Rough timber, open shelving and rustic homely comfort.",
    },
    palette: ["#FAF7F2", "#D4C5AE", "#6B5B4B", "#3C4A3E"],
    materials: [
      { uk: "старе дерево", en: "reclaimed wood" },
      { uk: "кована сталь", en: "wrought iron" },
      { uk: "бавовна", en: "cotton" },
    ],
    priority: 4,
  },
  {
    slug: "mediterranean",
    name: { uk: "Середземноморський", en: "Mediterranean" },
    summary: {
      uk: "Тинькові стіни, теракота, арки та сонячні відтінки.",
      en: "Plastered walls, terracotta, arches and sunny tones.",
    },
    palette: ["#F6EFE4", "#E2B07A", "#B5543B", "#2C5D8A"],
    materials: [
      { uk: "теракота", en: "terracotta" },
      { uk: "декоративна штукатурка", en: "lime plaster" },
      { uk: "кована сталь", en: "wrought iron" },
    ],
    priority: 3,
  },
  {
    slug: "wabi-sabi",
    name: { uk: "Вабі-сабі", en: "Wabi-sabi" },
    summary: {
      uk: "Краса недосконалості: натуральні фактури, ручна робота й тиша.",
      en: "Beauty in imperfection: raw textures, handmade pieces and quiet.",
    },
    palette: ["#ECE7DF", "#BFB3A2", "#857867", "#45403A"],
    materials: [
      { uk: "глина", en: "clay" },
      { uk: "необроблене дерево", en: "raw wood" },
      { uk: "льон", en: "linen" },
    ],
    priority: 3,
  },
  {
    slug: "eclectic",
    name: { uk: "Еклектика", en: "Eclectic" },
    summary: {
      uk: "Сміливе поєднання епох, кольорів і візерунків з однією об'єднавчою ідеєю.",
      en: "A bold mix of eras, colours and patterns tied together by one idea.",
    },
    palette: ["#F2E8CF", "#E07A5F", "#3D405B", "#81B29A"],
    materials: [
      { uk: "вінтажні меблі", en: "vintage furniture" },
      { uk: "візерунчасті шпалери", en: "patterned wallpaper" },
      { uk: "кераміка", en: "ceramics" },
    ],
    priority: 2,
  },
];

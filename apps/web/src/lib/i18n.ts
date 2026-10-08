export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uk";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// hreflang codes for <link rel="alternate">; uk-UA so Google maps it to Ukraine searches.
export const hreflang: Record<Locale, string> = { uk: "uk-UA", en: "en" };

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const dictionaries = {
  uk: {
    siteName: "Restyle",
    tagline: "AI-редизайн інтер'єру за хвилину",
    heroLead:
      "Завантажте фото кімнати, оберіть стиль — і побачте, як вона може виглядати. Без реєстрації для першої спроби.",
    cta: "Спробувати безкоштовно",
    rooms: "Кімнати",
    styles: "Стилі",
    ideasFor: "Ідеї для кімнати",
    styleIn: "Стиль у різних кімнатах",
    palette: "Палітра",
    materials: "Матеріали",
    tips: "Як втілити",
    faq: "Питання",
    otherStyles: "Інші стилі для цієї кімнати",
    otherRooms: "Цей стиль в інших кімнатах",
    home: "Головна",
    ideas: "Ідеї",
  },
  en: {
    siteName: "Restyle",
    tagline: "AI interior redesign in a minute",
    heroLead:
      "Upload a photo of your room, pick a style and see how it could look. No sign-up for your first try.",
    cta: "Try it free",
    rooms: "Rooms",
    styles: "Styles",
    ideasFor: "Ideas for",
    styleIn: "The style across rooms",
    palette: "Palette",
    materials: "Materials",
    tips: "How to get the look",
    faq: "FAQ",
    otherStyles: "Other styles for this room",
    otherRooms: "This style in other rooms",
    home: "Home",
    ideas: "Ideas",
  },
} satisfies Record<Locale, Record<string, string>>;

export type Dictionary = (typeof dictionaries)["uk"];
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export const paths = {
  home: (l: Locale) => `/${l}`,
  room: (l: Locale, room: string) => `/${l}/ideas/${room}`,
  style: (l: Locale, style: string) => `/${l}/styles/${style}`,
  idea: (l: Locale, room: string, style: string) => `/${l}/ideas/${room}/${style}`,
};

/** `alternates` block for generateMetadata: canonical + hreflang for every locale + x-default. */
export function alternatesFor(locale: Locale, pathFor: (l: Locale) => string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[hreflang[l]] = pathFor(l);
  languages["x-default"] = pathFor(defaultLocale);
  return { canonical: pathFor(locale), languages };
}

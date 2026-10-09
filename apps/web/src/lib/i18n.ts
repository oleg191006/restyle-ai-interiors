export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uk";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// hreflang codes for <link rel="alternate">; uk-UA so Google maps it to Ukraine searches.
export const hreflang: Record<Locale, string> = { uk: "uk-UA", en: "en" };

// Absolute base for canonical, hreflang and sitemap URLs. On Vercel, falls back to the
// production domain so preview builds never emit localhost.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const dictionaries = {
  uk: {
    siteName: "Restyle",
    tagline: "AI-редизайн інтер'єру за хвилину",
    heroLead:
      "Завантажте фото кімнати, оберіть стиль — і побачте, як вона може виглядати. Без реєстрації для першої спроби.",
    cta: "Спробувати безкоштовно",
    rooms: "Кімнати",
    styles: "Стилі",
    roomIdeas: "{room}: ідеї дизайну",
    styleIn: "Стиль у різних кімнатах",
    palette: "Палітра",
    materials: "Матеріали",
    tips: "Як втілити",
    faq: "Питання",
    otherStyles: "Інші стилі для цієї кімнати",
    otherRooms: "Цей стиль в інших кімнатах",
    home: "Головна",
    ideas: "Ідеї",
    ideasTitle: "Ідеї інтер'єру для кожної кімнати",
    ideasLead: "Оберіть кімнату, щоб побачити 15 стилів з палітрами, матеріалами й порадами.",
    stylesTitle: "Стилі інтер'єру",
    stylesLead: "Палітра, матеріали й характер кожного стилю — і як він виглядає в різних кімнатах.",
    toolTitle: "Редизайн кімнати за фото",
    toolLead: "Завантажте фото кімнати й оберіть стиль. AI збереже планування й замінить меблі, оздоблення й кольори.",
    toolPhoto: "Фото кімнати",
    toolPhotoHint: "JPG, PNG або HEIC з телефона. Фото зменшується у вашому браузері, дані про місце зйомки видаляються.",
    toolRoom: "Кімната",
    toolStyle: "Стиль",
    toolSubmit: "Згенерувати",
    toolUploading: "Завантажуємо фото…",
    toolQueued: "У черзі…",
    toolRunning: "Генеруємо редизайн…",
    toolBefore: "До",
    toolAfter: "Після",
    toolAgain: "Спробувати інший стиль",
    account: "Акаунт",
    accountTitle: "Акаунт",
    accountLead: "Без входу — 2 генерації на день, з акаунтом — 5.",
    signIn: "Увійти",
    signUp: "Створити акаунт",
    signOut: "Вийти",
    email: "Email",
    password: "Пароль",
    passwordHint: "Щонайменше 8 символів",
    toSignUp: "Немає акаунта? Створити",
    toSignIn: "Вже є акаунт? Увійти",
    authErrorSignIn: "Невірний email або пароль.",
    authErrorSignUp: "Не вдалося створити акаунт: можливо, цей email уже зайнятий або пароль закороткий.",
    plan: "План",
    planAnonymous: "Гість",
    planFree: "Free",
    planPro: "Pro",
    usage: "Сьогодні: {used} з {limit} генерацій",
    toolErrorLimitAnonymous: "Генерації без входу на сьогодні закінчились. Увійдіть — з акаунтом їх більше.",
    upgrade: "Перейти на Pro",
    proPitch: "Pro — {price} на місяць: {count} генерацій на день.",
    manageBilling: "Керувати підпискою",
    proRenews: "Наступне списання {date}.",
    proEnds: "Підписку скасовано: Pro діє до {date}, далі Free.",
    proPastDue: "Не вдалося списати оплату. Оновіть картку, щоб не втратити Pro.",
    checkoutPending: "Оплату отримано, активуємо Pro…",
    billingError: "Не вдалося відкрити оплату. Спробуйте ще раз.",
    toolErrorLimitFree: "Ліміт Free на сьогодні вичерпано. З Pro — більше генерацій щодня.",
    toolErrorGeneric: "Не вдалося згенерувати. Спробуйте ще раз.",
    toolErrorLimitVisitor: "Ви використали всі безкоштовні генерації на сьогодні. Повертайтесь завтра.",
    toolErrorLimitGlobal: "Сьогодні забагато охочих: денний ліміт сайту вичерпано. Спробуйте завтра.",
    toolErrorImage: "Не вдалося прочитати фото. Спробуйте інший файл.",
    toolErrorRateLimited: "Забагато спроб з вашої мережі. Спробуйте трохи пізніше.",
    toolPrivacy: "Фото зберігається 7 днів, потім видаляється автоматично.",
    exampleTitle: "Приклад AI-редизайну",
    exampleNote: "«До» — звичайна кімната, «після» згенерував наш AI за один запит. Спробуйте зі своїм фото.",
    exampleBeforeAlt: "до редизайну",
  },
  en: {
    siteName: "Restyle",
    tagline: "AI interior redesign in a minute",
    heroLead:
      "Upload a photo of your room, pick a style and see how it could look. No sign-up for your first try.",
    cta: "Try it free",
    rooms: "Rooms",
    styles: "Styles",
    roomIdeas: "{room} design ideas",
    styleIn: "The style across rooms",
    palette: "Palette",
    materials: "Materials",
    tips: "How to get the look",
    faq: "FAQ",
    otherStyles: "Other styles for this room",
    otherRooms: "This style in other rooms",
    home: "Home",
    ideas: "Ideas",
    ideasTitle: "Interior ideas for every room",
    ideasLead: "Pick a room to see 15 styles with palettes, materials and tips.",
    stylesTitle: "Interior design styles",
    stylesLead: "The palette, materials and character of each style, and how it looks in different rooms.",
    toolTitle: "Redesign your room from a photo",
    toolLead: "Upload a photo of your room and pick a style. The AI keeps the layout and replaces furniture, finishes and colours.",
    toolPhoto: "Room photo",
    toolPhotoHint: "JPG, PNG or HEIC from your phone. The photo is resized in your browser and location data is removed.",
    toolRoom: "Room",
    toolStyle: "Style",
    toolSubmit: "Generate",
    toolUploading: "Uploading photo…",
    toolQueued: "Queued…",
    toolRunning: "Generating the redesign…",
    toolBefore: "Before",
    toolAfter: "After",
    toolAgain: "Try another style",
    account: "Account",
    accountTitle: "Account",
    accountLead: "Without an account you get 2 generations a day, with one 5.",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters",
    toSignUp: "No account? Create one",
    toSignIn: "Already have an account? Sign in",
    authErrorSignIn: "Wrong email or password.",
    authErrorSignUp: "Could not create the account: the email may be taken or the password too short.",
    plan: "Plan",
    planAnonymous: "Guest",
    planFree: "Free",
    planPro: "Pro",
    usage: "Today: {used} of {limit} generations",
    toolErrorLimitAnonymous: "Today's generations without an account are used up. Sign in to get more.",
    upgrade: "Upgrade to Pro",
    proPitch: "Pro is {price} a month: {count} generations a day.",
    manageBilling: "Manage subscription",
    proRenews: "Next payment on {date}.",
    proEnds: "Subscription cancelled: Pro until {date}, then Free.",
    proPastDue: "The last payment failed. Update your card to keep Pro.",
    checkoutPending: "Payment received, activating Pro…",
    billingError: "Could not open the payment page. Please try again.",
    toolErrorLimitFree: "Today's Free generations are used up. Pro gives you more every day.",
    toolErrorGeneric: "Generation failed. Please try again.",
    toolErrorLimitVisitor: "You have used all free generations for today. Come back tomorrow.",
    toolErrorLimitGlobal: "Too many people today: the site daily limit is reached. Please try tomorrow.",
    toolErrorImage: "Could not read the photo. Try another file.",
    toolErrorRateLimited: "Too many attempts from your network. Please try again a bit later.",
    toolPrivacy: "Photos are kept for 7 days, then deleted automatically.",
    exampleTitle: "AI redesign example",
    exampleNote: "“Before” is an ordinary room; “after” was generated by our AI in one request. Try it with your own photo.",
    exampleBeforeAlt: "before the redesign",
  },
} satisfies Record<Locale, Record<string, string>>;

export type Dictionary = (typeof dictionaries)["uk"];
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export const paths = {
  home: (l: Locale) => `/${l}`,
  ideas: (l: Locale) => `/${l}/ideas`,
  styles: (l: Locale) => `/${l}/styles`,
  room: (l: Locale, room: string) => `/${l}/ideas/${room}`,
  style: (l: Locale, style: string) => `/${l}/styles/${style}`,
  idea: (l: Locale, room: string, style: string) => `/${l}/ideas/${room}/${style}`,
  account: (l: Locale) => `/${l}/account`,
  redesign: (l: Locale, room?: string, style?: string) => {
    const q = new URLSearchParams({ ...(room && { room }), ...(style && { style }) }).toString();
    return `/${l}/redesign${q ? `?${q}` : ""}`;
  },
};

/** `alternates` block for generateMetadata: canonical + hreflang for every locale + x-default. */
export function alternatesFor(locale: Locale, pathFor: (l: Locale) => string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[hreflang[l]] = pathFor(l);
  languages["x-default"] = pathFor(defaultLocale);
  return { canonical: pathFor(locale), languages };
}

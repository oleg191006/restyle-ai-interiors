import "dotenv/config";
import { prisma } from "./index.ts";
import { locales, rooms, styles, type Locale, type RoomSeed, type StyleSeed } from "./seed-data.ts";

// Builds the copy for one room × style × locale page from both entities' data,
// so no two pages share the same title, lead, tips or FAQ.
function buildPage(room: RoomSeed, style: StyleSeed, locale: Locale) {
  const r = room.name[locale];
  const s = style.name[locale];
  const materials = style.materials.map((m) => m[locale]);
  const [m1, m2, m3] = materials;

  if (locale === "uk") {
    return {
      title: `${r} у стилі «${s}»: ідеї та палітра`,
      lead: `${style.summary.uk} ${room.intro.uk} Нижче — палітра, матеріали й поради, як перенести стиль «${s}» саме у вашу кімнату.`,
      tips: [
        `Почніть з основи: стіни й підлога в найсвітлішому тоні палітри (${style.palette[0]}).`,
        `Головний матеріал — ${m1}; використайте його в найбільшому предметі кімнати.`,
        `Додайте ${m2} і ${m3} у текстилі та декорі, щоб стиль читався без перевантаження.`,
        `Темний тон палітри (${style.palette[style.palette.length - 1]}) — лише для акцентів: 10–15% поверхонь.`,
      ],
      faq: [
        {
          q: `Чи підійде стиль «${s}» для маленької кімнати (${r.toLowerCase()})?`,
          a: `Так, якщо тримати світлу базу палітри й обмежити кількість меблів. Матеріали ${m1} і ${m2} візуально не обтяжують простір.`,
        },
        {
          q: `Як швидко побачити, як моя ${r.toLowerCase()} виглядатиме в цьому стилі?`,
          a: `Завантажте фото кімнати в Restyle й оберіть стиль «${s}» — AI згенерує варіант редизайну за хвилину.`,
        },
      ],
    };
  }

  return {
    title: `${s} ${r.toLowerCase()} ideas and colour palette`,
    lead: `${style.summary.en} ${room.intro.en} Below are the palette, materials and tips for bringing ${s.toLowerCase()} style into your own space.`,
    tips: [
      `Start with the base: walls and floor in the lightest tone of the palette (${style.palette[0]}).`,
      `Lead with ${m1}; use it on the largest piece in the room.`,
      `Layer ${m2} and ${m3} through textiles and decor so the style reads without clutter.`,
      `Keep the darkest tone (${style.palette[style.palette.length - 1]}) for accents: 10–15% of surfaces.`,
    ],
    faq: [
      {
        q: `Does ${s.toLowerCase()} style work in a small ${r.toLowerCase()}?`,
        a: `Yes, if you keep the light base of the palette and limit the furniture. ${m1[0].toUpperCase() + m1.slice(1)} and ${m2} keep the space visually light.`,
      },
      {
        q: `How can I preview my ${r.toLowerCase()} in this style?`,
        a: `Upload a photo of your room to Restyle and pick ${s} — the AI generates a redesign in about a minute.`,
      },
    ],
  };
}

async function main() {
  for (const room of rooms) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      update: { priority: room.priority },
      create: { slug: room.slug, priority: room.priority },
    });
  }
  for (const style of styles) {
    await prisma.style.upsert({
      where: { slug: style.slug },
      update: { priority: style.priority, palette: style.palette },
      create: { slug: style.slug, priority: style.priority, palette: style.palette },
    });
  }

  const roomIds = new Map((await prisma.room.findMany()).map((r) => [r.slug, r.id]));
  const styleIds = new Map((await prisma.style.findMany()).map((s) => [s.slug, s.id]));

  for (const locale of locales) {
    for (const room of rooms) {
      const roomId = roomIds.get(room.slug)!;
      await prisma.roomTranslation.upsert({
        where: { roomId_locale: { roomId, locale } },
        update: { name: room.name[locale], intro: room.intro[locale] },
        create: { roomId, locale, name: room.name[locale], intro: room.intro[locale] },
      });
    }
    for (const style of styles) {
      const styleId = styleIds.get(style.slug)!;
      const data = {
        name: style.name[locale],
        summary: style.summary[locale],
        materials: style.materials.map((m) => m[locale]),
      };
      await prisma.styleTranslation.upsert({
        where: { styleId_locale: { styleId, locale } },
        update: data,
        create: { styleId, locale, ...data },
      });
    }
  }

  let pages = 0;
  for (const locale of locales) {
    for (const room of rooms) {
      for (const style of styles) {
        const roomId = roomIds.get(room.slug)!;
        const styleId = styleIds.get(style.slug)!;
        const content = buildPage(room, style, locale);
        await prisma.ideaPage.upsert({
          where: { roomId_styleId_locale: { roomId, styleId, locale } },
          update: content,
          create: { roomId, styleId, locale, ...content },
        });
        pages++;
      }
    }
  }

  console.log(`Seeded ${rooms.length} rooms, ${styles.length} styles, ${pages} pages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

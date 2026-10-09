import { PaletteTiles } from "@/components/ui/swatches";
import type { Dictionary } from "@/lib/i18n";

const card = "space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-7";
const title = "font-display text-2xl font-semibold sm:text-3xl";

/** The style's palette and materials as two cards side by side. */
export function StyleDetails({ t, palette, materials }: { t: Dictionary; palette: string[]; materials: string[] }) {
  return (
    <section className="grid gap-5 md:grid-cols-2">
      <div className={card}>
        <h2 className={title}>{t.palette}</h2>
        <PaletteTiles colors={palette} label={t.palette} />
      </div>
      <div className={card}>
        <h2 className={title}>{t.materials}</h2>
        <ul className="flex flex-wrap gap-2.5">
          {materials.map((m) => (
            <li key={m} className="rounded-full bg-accent-soft px-4 py-2">
              {m}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

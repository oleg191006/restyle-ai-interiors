import Image from "next/image";
import { useState, type Ref } from "react";
import { Swatches } from "@/components/ui/swatches";
import { fill, type Dictionary } from "@/lib/i18n";
import { peerFocus, stepLabel } from "./step-label";

/** A style card's picture is the published example for the chosen room, if there is one. */
export type StyleOption = { slug: string; name: string; palette: string[]; examples: Record<string, string> };

const FIRST_STYLES = 6; // the rest behind "Show all": fifteen cards at once is a wall

/**
 * Step 3. Radio inputs styled as picture cards. The selected style stays visible even when it
 * is beyond the first six (a landing page can preselect any of them).
 */
export function StyleField({
  t,
  styles,
  room,
  value,
  onChange,
  disabled,
  ref,
}: {
  t: Dictionary;
  styles: StyleOption[];
  room: string;
  value: string;
  onChange: (slug: string) => void;
  disabled: boolean;
  ref?: Ref<HTMLFieldSetElement>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? styles : styles.filter((s, i) => i < FIRST_STYLES || s.slug === value);

  return (
    <fieldset ref={ref} className="space-y-3" disabled={disabled}>
      <legend className={`mb-3 ${stepLabel}`}>3 · {t.toolStyle}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((s) => (
          <label key={s.slug} className="cursor-pointer">
            <input type="radio" name="style" value={s.slug} checked={value === s.slug} onChange={() => onChange(s.slug)} className="peer sr-only" />
            <span
              className={`block rounded-xl bg-surface p-1.5 ring-1 ring-line peer-checked:ring-2 peer-checked:ring-accent hover:ring-line-strong ${peerFocus}`}
            >
              <StylePicture style={s} room={room} />
              <span className="block px-1.5 pt-2 pb-1 text-[15px] font-semibold">{s.name}</span>
            </span>
          </label>
        ))}
      </div>
      {!showAll && styles.length > visible.length && (
        <button type="button" onClick={() => setShowAll(true)} className="min-h-11 font-semibold text-accent hover:underline">
          {fill(t.toolShowAllStyles, { count: styles.length })}
        </button>
      )}
    </fieldset>
  );
}

function StylePicture({ style, room }: { style: StyleOption; room: string }) {
  const image = style.examples[room] ?? Object.values(style.examples)[0];
  return (
    <span className="block aspect-4/3 overflow-hidden rounded-lg bg-line">
      {image ? (
        <Image src={image} alt="" width={1024} height={768} sizes="(min-width: 1024px) 160px, (min-width: 640px) 30vw, 45vw" className="h-full w-full object-cover" />
      ) : (
        <Swatches colors={style.palette} className="h-full justify-center" />
      )}
    </span>
  );
}

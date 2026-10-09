import type { Dictionary } from "@/lib/i18n";
import { peerFocus, stepLabel } from "./step-label";

export type RoomOption = { slug: string; name: string };

/** Step 2. Rooms are real radio inputs styled as chips: arrows, screen readers and tests work. */
export function RoomField({
  t,
  rooms,
  value,
  onChange,
  disabled,
}: {
  t: Dictionary;
  rooms: RoomOption[];
  value: string;
  onChange: (slug: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className={`mb-3 ${stepLabel}`}>2 · {t.toolRoom}</legend>
      <div className="flex flex-wrap gap-2">
        {rooms.map((r) => (
          <label key={r.slug} className="cursor-pointer">
            <input type="radio" name="room" value={r.slug} checked={value === r.slug} onChange={() => onChange(r.slug)} className="peer sr-only" />
            <span
              className={`inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-[15px] peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background hover:border-foreground ${peerFocus}`}
            >
              {r.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

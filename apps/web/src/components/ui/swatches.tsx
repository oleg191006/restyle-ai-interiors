const dot = { sm: "size-3.5", md: "size-5", lg: "size-7" };
const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2" };

/** A style's palette as a row of dots: a placeholder where no photo exists, or a legend. Decorative. */
export function Swatches({ colors, size = "md", className = "" }: { colors: string[]; size?: keyof typeof dot; className?: string }) {
  return (
    <span aria-hidden className={`flex items-center ${gap[size]} ${className}`}>
      {colors.map((c) => (
        <span key={c} className={`${dot[size]} rounded-full ring-1 ring-black/10`} style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

/** The palette as large tiles with their hex codes (style and landing pages). */
export function PaletteTiles({ colors, label }: { colors: string[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-4 gap-3">
      {colors.map((c) => (
        <li key={c} className="space-y-2">
          <span className="block aspect-square rounded-xl ring-1 ring-black/10" style={{ backgroundColor: c }} />
          <code className="text-xs text-muted">{c}</code>
        </li>
      ))}
    </ul>
  );
}

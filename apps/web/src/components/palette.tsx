export function Palette({ colors, label }: { colors: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex gap-2">
      {colors.map((c) => (
        <li key={c} className="flex flex-col items-center gap-1">
          <span
            className="block size-14 rounded-lg border border-line"
            style={{ backgroundColor: c }}
          />
          <code className="text-xs text-muted">{c}</code>
        </li>
      ))}
    </ul>
  );
}

/**
 * Small swatch strip used on cards. Fixed height so it never shifts layout; the ring keeps a
 * colour close to the page background (dark palettes in dark mode) from looking cut off.
 */
export function PaletteStrip({ colors }: { colors: string[] }) {
  return (
    <span className="flex h-2 overflow-hidden rounded-full ring-1 ring-line" aria-hidden>
      {colors.map((c) => (
        <span key={c} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

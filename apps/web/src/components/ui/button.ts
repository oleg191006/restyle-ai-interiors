/**
 * Class names for every pill-shaped control, so <button> and <Link> look the same and the
 * shape, sizes and colours live in one place. Layout extras (w-full, self-start) go in `extra`.
 */
const variants = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  dark: "bg-foreground text-background hover:opacity-90",
  outline: "border border-line-strong bg-surface hover:border-foreground",
  inverse: "bg-inverse-foreground text-inverse hover:opacity-90",
};

const sizes = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-6",
  lg: "min-h-12 px-6",
  xl: "min-h-14 px-8 text-lg",
};

export type ButtonVariant = keyof typeof variants;

export function button(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `inline-flex items-center justify-center rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`;
}

/** A plain text link with an underline that turns accent on hover ("See examples", "All styles"). */
export const textLink = "border-b border-foreground font-semibold hover:border-accent hover:text-accent";

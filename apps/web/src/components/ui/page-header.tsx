import type { ReactNode } from "react";

/** The h1 and lead every inner page starts with. */
export function PageHeader({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <header className="max-w-3xl space-y-3">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {lead && <p className="max-w-2xl text-lg text-muted">{lead}</p>}
    </header>
  );
}

/** "01", "02"…: the numbers on the home steps and landing tips. */
export const ordinal = (i: number) => String(i + 1).padStart(2, "0");

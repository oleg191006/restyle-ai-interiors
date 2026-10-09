import Link from "next/link";

/** A wrapping row of pill links: rooms on the home page, "this style in other rooms" on landings. */
export function ChipLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="inline-block rounded-full border border-line-strong bg-surface px-4 py-2.5 hover:border-foreground">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

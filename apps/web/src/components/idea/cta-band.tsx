import Link from "next/link";
import { button } from "@/components/ui/button";
import { fill, type Dictionary } from "@/lib/i18n";

/** The closing call to action on a dark band. */
export function CtaBand({ t, styleName, href }: { t: Dictionary; styleName: string; href: string }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-inverse p-8 text-inverse-foreground sm:p-12">
      <div className="max-w-xl space-y-2">
        <h2 className="font-display text-3xl font-semibold">{t.ctaBandTitle}</h2>
        <p className="text-inverse-muted">{fill(t.ctaBandText, { style: styleName })}</p>
      </div>
      <Link href={href} className={button("inverse", "lg")}>
        {t.heroUpload}
      </Link>
    </section>
  );
}

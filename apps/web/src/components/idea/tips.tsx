import { ordinal } from "@/components/ui/page-header";
import type { Dictionary } from "@/lib/i18n";

/** "How to get the look": numbered tips in up to four columns. */
export function Tips({ t, tips }: { t: Dictionary; tips: string[] }) {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t.tips}</h2>
      <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {tips.map((tip, i) => (
          <li key={tip} className="space-y-2 border-t-2 border-foreground pt-4">
            <span className="font-display block text-3xl leading-none text-accent">{ordinal(i)}</span>
            <p>{tip}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

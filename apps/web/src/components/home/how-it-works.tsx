import { ordinal } from "@/components/ui/page-header";
import { fill, type Dictionary } from "@/lib/i18n";

/** Three numbered steps under the hero. */
export function HowItWorks({ t, styleCount }: { t: Dictionary; styleCount: number }) {
  const steps = [
    { title: t.step1Title, text: t.step1Text },
    { title: t.step2Title, text: fill(t.step2Text, { count: styleCount }) },
    { title: t.step3Title, text: t.step3Text },
  ];
  return (
    <section className="border-y border-line bg-surface">
      <ol className="container-page grid gap-8 py-12 sm:grid-cols-3 sm:gap-10 sm:py-16">
        {steps.map((s, i) => (
          <li key={s.title} className="space-y-2">
            <span className="font-display text-4xl leading-none text-accent">{ordinal(i)}</span>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

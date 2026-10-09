import { JsonLd } from "@/components/json-ld";
import type { Faq as FaqItems } from "@/lib/data";
import type { Dictionary } from "@/lib/i18n";

/**
 * Questions as <details>: the answers stay in the HTML for search engines, the first is open.
 * The same questions go into FAQPage structured data.
 */
export function Faq({ t, items }: { t: Dictionary; items: FaqItems }) {
  return (
    <section className="max-w-3xl space-y-2">
      <h2 className="font-display mb-4 text-3xl font-semibold sm:text-4xl">{t.faq}</h2>
      {items.map((f, i) => (
        <details key={f.q} open={i === 0} className="group border-b border-line py-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span aria-hidden className="text-2xl leading-none text-accent transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="pt-2 pb-2 text-muted">{f.a}</p>
        </details>
      ))}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </section>
  );
}

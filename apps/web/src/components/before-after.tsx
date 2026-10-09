import Image from "next/image";

/**
 * Server-rendered before/after pair: no client JS. Two columns at every width: on phones the
 * comparison is visible at a glance, each image downloads at half the width (~375 px), and
 * stacked full-width images became the LCP element and pushed mobile LCP over budget
 * (2.82 s in Lighthouse CI). Eager loading; the first image gets high fetch priority because
 * on desktop it is the LCP element (on mobile dropping it made no measurable difference).
 */
export function BeforeAfter({
  before,
  after,
  beforeAlt,
  afterAlt,
  beforeLabel,
  afterLabel,
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  // main is max-w-5xl (1024 px) with 16 px padding; always two columns.
  const sizes = "(min-width: 1024px) 496px, 50vw";
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      <figure className="space-y-2">
        <Image
          src={before}
          alt={beforeAlt}
          width={1024}
          height={768}
          sizes={sizes}
          loading="eager"
          fetchPriority="high"
          className="h-auto w-full rounded-xl border border-line"
        />
        <figcaption className="text-sm text-muted">{beforeLabel}</figcaption>
      </figure>
      <figure className="space-y-2">
        <Image
          src={after}
          alt={afterAlt}
          width={1024}
          height={768}
          sizes={sizes}
          loading="eager"
          className="h-auto w-full rounded-xl border border-line"
        />
        <figcaption className="text-sm text-muted">{afterLabel}</figcaption>
      </figure>
    </div>
  );
}

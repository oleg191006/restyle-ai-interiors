import Image from "next/image";
import { NearViewport } from "@/components/near-viewport";
import { Swatches } from "@/components/ui/swatches";

// Cards in a hub's first row; the grids show 2–3 per row, so 3 covers it on every screen.
const FIRST_ROW = 3;

/**
 * 4:3 media on hub cards: the "after" image when the pair has a published example, otherwise
 * the style palette as swatches in the same box, so cards with and without examples line up.
 * The parent link carries `group` for the hover zoom.
 *
 * `position` is the card's index in the grid. The first image is the LCP element, so it is
 * preloaded from <head> at high priority (without that it waited ~350 ms for the markup and then
 * shared the line with the scripts); the rest of the first row is lazy; everything below mounts
 * only near the viewport. With 13 photos all lazy, Chrome started them together and lab LCP went from
 * 2.4 to 3.0 s on the living-room hub (ADR 0013, lesson 1).
 */
export function ExampleThumb({ src, palette, alt, sizes, position }: { src?: string; palette?: string[]; alt: string; sizes: string; position: number }) {
  const lcp = position === 0;
  const image = src && (
    <Image
      src={src}
      alt={alt}
      width={1024}
      height={768}
      sizes={sizes}
      preload={lcp}
      loading={lcp ? "eager" : "lazy"}
      fetchPriority={lcp ? "high" : "auto"}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
    />
  );
  return (
    <span className="block aspect-4/3 overflow-hidden rounded-2xl bg-accent-soft">
      {image ? (
        position < FIRST_ROW ? image : <NearViewport>{image}</NearViewport>
      ) : (
        palette && <Swatches colors={palette} size="lg" className="h-full justify-center" />
      )}
    </span>
  );
}

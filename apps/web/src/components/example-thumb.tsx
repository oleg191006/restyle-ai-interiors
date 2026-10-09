import Image from "next/image";

/**
 * 4:3 media on hub cards: the "after" image when the pair has a published example, otherwise
 * the style palette as swatches in the same box, so cards with and without examples line up. Below the
 * fold, so the image stays lazy (the default).
 */
export function ExampleThumb({ src, palette, alt, sizes }: { src?: string; palette: string[]; alt: string; sizes: string }) {
  if (src) {
    return <Image src={src} alt={alt} width={1024} height={768} sizes={sizes} className="h-auto w-full rounded-lg" />;
  }
  return (
    <span aria-hidden className="flex aspect-4/3 w-full items-center justify-center gap-2 rounded-lg bg-line/40">
      {palette.map((c) => (
        <span key={c} className="size-8 rounded-full ring-1 ring-line" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

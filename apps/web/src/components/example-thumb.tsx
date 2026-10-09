import Image from "next/image";

/**
 * 4:3 media on hub cards: the "after" image when the pair has a published example, otherwise
 * the style palette as swatches in the same box, so cards with and without examples line up.
 * The parent link carries `group` for the hover zoom. Lazy by default (most are below the fold).
 */
export function ExampleThumb({ src, palette, alt, sizes }: { src?: string; palette?: string[]; alt: string; sizes: string }) {
  return (
    <span className="block aspect-4/3 overflow-hidden rounded-2xl bg-accent-soft">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={1024}
          height={768}
          sizes={sizes}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <span aria-hidden className="flex h-full items-center justify-center gap-2">
          {palette?.map((c) => (
            <span key={c} className="size-7 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
          ))}
        </span>
      )}
    </span>
  );
}

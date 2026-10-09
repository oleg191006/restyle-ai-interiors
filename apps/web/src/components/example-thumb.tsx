import Image from "next/image";

/** Small "after" image on hub cards. Below the fold, so it stays lazy (the default). */
export function ExampleThumb({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  return (
    <Image src={src} alt={alt} width={1024} height={768} sizes={sizes} className="h-auto w-full rounded-lg" />
  );
}

import Image from "next/image";

/**
 * A photo in the first-screen before/after slider. The bottom layer (`lcp`) is the LCP element:
 * preloaded at high priority. The top layer loads eagerly at normal priority, so the two do not
 * compete. Quality 60 is invisible at this size and listed in next.config `images.qualities`.
 */
export function HeroImage({ src, alt, lcp = false }: { src: string; alt: string; lcp?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1024}
      height={768}
      sizes="(min-width: 1200px) 640px, (min-width: 1024px) 54vw, 100vw"
      quality={60}
      preload={lcp}
      fetchPriority={lcp ? "high" : "auto"}
      loading="eager"
      className="h-full w-full object-cover"
    />
  );
}

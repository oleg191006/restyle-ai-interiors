import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The db package ships TypeScript source; let Next compile it.
  transpilePackages: ["@restyle/db"],
  serverExternalPackages: ["pg"],
  images: {
    // Measured on the examples at 640w: AVIF 16 KB vs WebP 26 KB; browsers without AVIF get WebP.
    formats: ["image/avif", "image/webp"],
    // Only the generated examples are optimized; nothing else can use the optimizer.
    localPatterns: [{ pathname: "/examples/**", search: "" }],
    // 60 for the home hero only: both slider layers load before LCP (ADR 0013).
    qualities: [60, 75],
  },
  // OG images read these at runtime for pages rendered after the build.
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/*.ttf"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

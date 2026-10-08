import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Shared Open Graph image layout. Only used to render PNGs on the server, so the
// font here never reaches the browser (the site itself uses the system stack, ADR 0002).
// The default next/og font has no Cyrillic glyphs, hence the bundled Inter subsets.
// Read with top-level await: Cache Components rejects uncached IO during render.

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const fontDir = join(process.cwd(), "assets/fonts");
const fonts = await Promise.all(
  (["latin", "cyrillic"] as const).flatMap((subset) =>
    ([400, 700] as const).map(async (weight) => ({
      // Distinct names per subset: Satori keeps one file per name+weight, so a shared
      // name would silently drop the Cyrillic glyphs.
      name: subset === "latin" ? "Inter" : "Inter Cyrillic",
      data: await readFile(join(fontDir, `inter-${subset}-${weight}.ttf`)),
      weight,
      style: "normal" as const,
    })),
  ),
);

const colors = { background: "#fbfaf8", foreground: "#1c1a17", muted: "#6b655c", accent: "#7a5c3e" };
const brandPalette = ["#f5efe6", "#d9c7ae", "#a98b69", "#7a5c3e", "#3b2f25"];

export async function renderOgImage({
  eyebrow,
  title,
  palette = brandPalette,
}: {
  eyebrow: string;
  title: string;
  palette?: string[];
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: colors.background,
          color: colors.foreground,
          fontFamily: "Inter, Inter Cyrillic",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Restyle</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 30, color: colors.accent }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
            {title}
          </div>
        </div>
        <div style={{ display: "flex", height: 28, borderRadius: 14, overflow: "hidden" }}>
          {palette.map((c) => (
            <div key={c} style={{ display: "flex", flex: 1, background: c }} />
          ))}
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}

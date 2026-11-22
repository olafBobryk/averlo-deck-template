// The app icons (src/app/icon.tsx and apple-icon.tsx): the brand's mark on
// the deck's dark background, rendered to PNG by Next at build time. The
// mark follows the brand config as in the intro: the Averlo mark, the
// owner's `mark`, or the "your logo" placeholder.
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ImageResponse } from "next/og";
import { config } from "./config";
import { iconMarkFor } from "./marks";

/** Averlo's dark background (the ported appearance's dark theme colour). */
const background = "#03050a";

const types: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** A mark file is a square canvas whose middle box (240 of 512 px, the
 *  placeholder's box) holds the mark. The icon draws the canvas at 1.4 times
 *  its size, so the box spans 66% of the icon, as the Averlo icons did. */
const scale = 1.4;

/** The square PNG app icon, `size` px wide, for the deck's brand. */
export async function appIcon(size: number) {
  const { file } = iconMarkFor(config.brand);
  // Read when the icon is prerendered at build time; nothing to trace.
  const bytes = await readFile(
    join(/* turbopackIgnore: true */ process.cwd(), file),
  );
  const type = types[extname(file).toLowerCase()] ?? "image/png";
  const drawn = Math.round(size * scale);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og, not a page */}
      <img
        src={`data:${type};base64,${bytes.toString("base64")}`}
        width={drawn}
        height={drawn}
        alt=""
        style={{ flexShrink: 0 }}
      />
    </div>,
    { width: size, height: size },
  );
}

// Which mark the intro and the hard-load screen show (FR-004a, FR-005;
// research R9). Plain data with no asset imports, so tests can check the
// choice for every brand.
import type { Brand } from "./config";

/** The Averlo mark as an image: the ported `Logo`'s mark path
 *  (src/components/branding/Logo.tsx), in the placeholder's square. An
 *  image, because the hard-load script waits on an image's decode and the
 *  intro's fog draws the mark from one. */
export const averloMark = "/brand/averlo-mark.svg";

/** Averlo's mark, the owner's, or the "your logo" placeholder. */
export type MarkKind = "averlo" | "owner" | "placeholder";

/** The mark for `brand`: Averlo's; the owner's `mark` (a path under
 *  public/brand/); or `placeholder` until the owner gives one. */
export function markFor(
  brand: Brand,
  placeholder: string,
): { src: string; kind: MarkKind } {
  if (brand.kind === "averlo") return { src: averloMark, kind: "averlo" };
  if (!brand.mark) return { src: placeholder, kind: "placeholder" };
  const file = brand.mark.replace(/^\/?(public\/)?brand\//, "");
  return { src: `/brand/${file}`, kind: "owner" };
}

/** The "your logo" placeholder's file, relative to the repository. */
export const placeholderFile = "src/brand/placeholder/your-logo.svg";

/** Averlo's favicon: the round gradient badge with the white mark, ported
 *  unchanged from averlo-web-transition with its PNG and ICO fallbacks
 *  (scripts/ports.manifest.json; T051). */
export const averloFavicon = {
  svg: "/favicon.svg",
  png: "/favicon-96x96.png",
  ico: "/favicon.ico",
};

/** The file the app icons draw for `brand`, relative to the repository:
 *  Averlo's favicon badge, else the same choice as `markFor`, read from
 *  disk when Next renders the icons (src/brand/app-icon.tsx). */
export function iconMarkFor(brand: Brand): { file: string; kind: MarkKind } {
  if (brand.kind === "averlo")
    return { file: `public${averloFavicon.svg}`, kind: "averlo" };
  const { src, kind } = markFor(brand, placeholderFile);
  return { file: kind === "placeholder" ? src : `public${src}`, kind };
}

/** The tab's icon links for `brand`, as the root layout's metadata `icons`:
 *  for Averlo, its ported favicon (the SVG first, then the PNG, and the ICO
 *  as the shortcut icon), with the generated Apple touch icon; for an
 *  owner's brand, none, so Next links the generated icons, which draw the
 *  owner's mark or the placeholder (src/app/icon.tsx, apple-icon.tsx). */
export function iconLinks(brand: Brand) {
  if (brand.kind !== "averlo") return undefined;
  return {
    icon: [
      { url: averloFavicon.svg, type: "image/svg+xml" },
      { url: averloFavicon.png, type: "image/png", sizes: "96x96" },
    ],
    shortcut: averloFavicon.ico,
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  };
}

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

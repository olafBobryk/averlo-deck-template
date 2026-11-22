// The brand's name and logo as the deck's chrome shows them (FR-005): the
// top bar's brand slot (the footer carries no brand, owner after reviewing
// the merged build).
import type { Brand } from "./config";

/** "Averlo" by default, else the owner's brand name. */
export const brandName = (brand: Brand) =>
  brand.kind === "averlo" ? "Averlo" : brand.name;

/** The owner's logo as served (a path under public/brand/ is served as
 *  /brand/<file>), or null: Averlo's is the ported Logo, and an owner
 *  without one shows the "your logo" placeholder. */
export function logoSrc(brand: Brand): string | null {
  if (brand.kind === "averlo" || !brand.logo) return null;
  const file = brand.logo.replace(/^\/?(public\/)?brand\//, "");
  return `/brand/${file}`;
}

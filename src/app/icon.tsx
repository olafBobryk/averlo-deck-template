// The app icon: the brand's mark (src/brand/app-icon.tsx).
import { appIcon } from "@/brand/app-icon";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return appIcon(size.width);
}

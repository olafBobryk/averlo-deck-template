"use client";

import { usePathname } from "next/navigation";
import { publicPathname } from "./routing";

// Prerendering sees /<locale>/path; the browser keeps /path after the rewrite.
export function usePublicPathname() {
	return publicPathname(usePathname());
}

"use client";
import { createContext, useContext } from "react";
/** Portals opened inside a Dialog stay in its focus/accessibility layer. */
export const OverlayPortalTarget = createContext<HTMLElement | undefined>(
  undefined,
);
export const useOverlayPortalTarget = () => useContext(OverlayPortalTarget);

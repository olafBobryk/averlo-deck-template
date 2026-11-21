"use client";
import { createContext, useContext } from "react";
import type { Slide } from "./model";
import { slides } from "./slides";

/** The deck's slides, so /print and its PDFs need no provider. */
export const DeckContext = createContext<{
  slides: Slide[];
}>({
  slides,
});
export const useDeck = () => useContext(DeckContext);

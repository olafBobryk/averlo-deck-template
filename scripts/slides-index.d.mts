// Types for the parts of scripts/slides-index.mjs that TypeScript files
// import (tests/docs/workflow-trace.spec.ts reads the dry run's slide files
// with `scanSlides`).
import type { SlideData } from "../src/deck/slide";

/** A slide file, as `scanSlides` reads it: its file name and its data. */
export type ScannedSlide = SlideData & { name: string };

/** The slide files in `dir`, in number order. Throws one error naming every
 *  file the deck cannot place. */
export function scanSlides(dir: string): ScannedSlide[];

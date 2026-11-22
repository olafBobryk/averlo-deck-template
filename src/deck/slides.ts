// The deck's slides: its slide files (src/slides/NN-name.tsx, feature 003),
// in number order, as the engine places them (id, kind, title, section and
// parent). Read from the generated data file (src/slides/data.ts), which
// holds each file's `meta` and `copy` as plain values, so plain Node and
// the tests import this list without the slides' components and styles; the
// deck's context (version.tsx) builds the same list from the slide index,
// with each file's component. A deck made from the template edits its slide
// files, not this file.

import { slideData } from "@/slides/data";
import type { Slide } from "./model";
import { fileSlide } from "./slide";

/** The deck's slides, in number order. */
export const slides: Slide[] = slideData.map(fileSlide);

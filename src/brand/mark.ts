// The deck's brand mark, from its config: what the intro and the hard-load
// screen compose in the placeholder's box.
import { config } from "./config";
import { markFor } from "./marks";
import { placeholderMark } from "./placeholder/mark";

/** The mark's URL and which mark it is (`data-brand-mark`). */
export const brandMark = markFor(config.brand, placeholderMark);

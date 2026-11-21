// The deck's configuration (data-model, "Deck configuration"; the contract is
// specs/001-deck-template/contracts/deck-config.md). A new deck's brand
// defaults to Averlo; for any other brand the owner supplies the assets,
// which go in public/brand/ and are listed in docs/licences.md.

/** Averlo (the default), or the owner's brand. With `owner` and no `mark`,
 *  the "your logo" placeholder shows. `logo` and `mark` are paths under
 *  `public/brand/`. */
export type Brand =
  | { kind: "averlo" }
  | { kind: "owner"; name: string; logo?: string; mark?: string };

export type DeckConfig = {
  brand: Brand;
  /** Shown in the top bar and used in the PDF file name. */
  deckTitle: string;
  /** The top bar's accent colour. Text on it must keep 4.5:1 contrast. */
  accent: string;
};

/** Averlo's accent, the top bar's default. */
export const defaultAccent = "#ff3200";

export const config: DeckConfig = {
  brand: { kind: "averlo" },
  deckTitle: "Deck",
  accent: defaultAccent,
};

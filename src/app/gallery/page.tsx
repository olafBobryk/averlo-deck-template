import { Deck } from "@/deck/Deck";
import { parseLang } from "@/deck/model";
import { GalleryDeck } from "@/presets/GalleryDeck";

/** The preset gallery (feature 002, FR-004): the deck engine with the
 *  gallery's slides (src/presets/gallery.ts). URL: `/gallery?s=<1-based
 *  slide>&lang=<language>`, as the deck's. */
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    s?: string;
    lang?: string;
  }>;
}) {
  const { s, lang } = await searchParams;
  const slide = Number.parseInt(s ?? "1", 10);
  return (
    <GalleryDeck>
      <Deck
        initialIndex={Number.isFinite(slide) ? slide - 1 : 0}
        initialLang={parseLang(lang)}
      />
    </GalleryDeck>
  );
}

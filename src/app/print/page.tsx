import { Fragment } from "react";
import { Footer } from "@/deck/Footer";
import { SlideView } from "@/deck/SlideView";
import { parseLang } from "@/deck/model";
import { slides } from "@/deck/slides";
import { gallery } from "@/presets/gallery";
import { GalleryDeck } from "@/presets/GalleryDeck";
import styles from "@/deck/deck.module.css";

/** Every slide of the deck, with its footer (no menu) on its own
 *  1920×1080 page, for the build's PDF render (scripts/render-pdf.mjs).
 *  Drawn still: no entrance, no retype. Behind the same gate as the deck; no
 *  hard-load screen (it sits outside the (deck) group). `?deck=gallery`
 *  draws the preset gallery (feature 002) instead, in its context. */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; deck?: string }>;
}) {
  const query = await searchParams;
  const lang = parseLang(query.lang);
  const isGallery = query.deck === "gallery";
  const Context = isGallery ? GalleryDeck : Fragment;
  const list = isGallery ? gallery.slides : slides;
  return (
    <Context>
      <style>{`
        @page { size: 1920px 1080px; margin: 0; }
        html, body { height: auto; overflow: visible; }
      `}</style>
      <div lang={lang}>
        {list.map((slide, index) => (
          <div key={slide.id} className={styles.printPage} data-print-page="">
            <SlideView slide={slide} lang={lang} still />
            <Footer index={index} lang={lang} still />
          </div>
        ))}
      </div>
    </Context>
  );
}

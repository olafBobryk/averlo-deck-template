import { Footer } from "@/deck/Footer";
import { SlideView } from "@/deck/SlideView";
import { parseLang } from "@/deck/model";
import { slides } from "@/deck/slides";
import styles from "@/deck/deck.module.css";

/** Every slide of the deck, with its footer (no menu) on its own
 *  1920×1080 page, for the build's PDF render (scripts/render-pdf.mjs).
 *  Drawn still: no entrance, no retype. Behind the same gate as the deck; no
 *  hard-load screen (it sits outside the (deck) group). */
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = parseLang((await searchParams).lang);
  return (
    <>
      <style>{`
        @page { size: 1920px 1080px; margin: 0; }
        html, body { height: auto; overflow: visible; }
      `}</style>
      <div lang={lang}>
        {slides.map((slide, index) => (
          <div key={slide.id} className={styles.printPage} data-print-page="">
            <SlideView slide={slide} lang={lang} still />
            <Footer index={index} lang={lang} still />
          </div>
        ))}
      </div>
    </>
  );
}

// The PDF's file name, `<slug>-<lang>.pdf`: shared by the deck's download
// links (`pdfHref` in model.ts) and scripts/render-pdf.mjs, which imports
// this file under plain Node, so it imports nothing.

/** The deck title as a file name: lowercased, every run of characters other
 *  than a–z and 0–9 replaced by "-", and the ends trimmed. A title with
 *  none of those characters gives `deck`. */
export const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "deck";

/** The deck's PDF in one language. */
export const pdfName = (title: string, lang: string) =>
  `${slug(title)}-${lang}.pdf`;

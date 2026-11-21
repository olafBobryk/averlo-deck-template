// Unit tests for the PDF file name (T036): `<slug>-<lang>.pdf`, where the
// slug is the deck title lowercased, every run of characters other than a–z
// and 0–9 replaced by "-", and the ends trimmed. The helper is the
// template-owned src/deck/pdf-name.ts, which both the deck (model.ts's
// `pdfHref`) and scripts/render-pdf.mjs import.
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { config } from "../../src/brand/config.ts";
import { pdfName, slug } from "../../src/deck/pdf-name.ts";

describe("slug", () => {
  test("lowercases and joins words with one hyphen", () => {
    assert.equal(slug("Deck"), "deck");
    assert.equal(slug("Placeholder Title"), "placeholder-title");
  });

  test("replaces every run of non-alphanumerics and trims the ends", () => {
    assert.equal(slug("Q3 Plan: Draft #2!"), "q3-plan-draft-2");
    assert.equal(slug("  --Hello,   World--  "), "hello-world");
    assert.equal(slug("a/b\\c_d.e"), "a-b-c-d-e");
  });

  test("keeps digits and runs of letters as they are", () => {
    assert.equal(slug("2026 review"), "2026-review");
    assert.equal(slug("abc123"), "abc123");
  });

  test("a title with no letter or digit a–z, 0–9 falls back to `deck`", () => {
    assert.equal(slug("!!!"), "deck");
    assert.equal(slug(""), "deck");
  });
});

describe("pdfName", () => {
  test("is `<slug>-<lang>.pdf`", () => {
    assert.equal(pdfName("Q3 Plan: Draft #2!", "en"), "q3-plan-draft-2-en.pdf");
    assert.equal(pdfName("Deck", "fr"), "deck-fr.pdf");
  });

  test("the template's title, `Deck`, names the PDF `deck-en.pdf`", () => {
    assert.equal(pdfName("Deck", "en"), "deck-en.pdf");
  });

  test("the configured deck title slugs to a file name", () => {
    assert.match(
      pdfName(config.deckTitle, "en"),
      /^[a-z0-9]+(-[a-z0-9]+)*-en\.pdf$/,
    );
  });
});

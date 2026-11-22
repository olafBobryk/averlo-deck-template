import type { Page } from "@playwright/test";

// The deck's blocks as /print draws them (feature 003, J2): the placeholder
// deck is slide files, whose blocks are free JSX, so a test finds the slide
// that holds a block by what the deck draws, not by its data. Each block
// sits in its frame (`data-block`); its list carries its style
// (`data-style`), a lead its size (`data-size`), and a step its status
// (`data-status`).

/** A drawn block. `nth`: its place among the slide's blocks of its type;
 *  `items`: the entries of its first list; `statuses`: its steps'. */
export type PrintedBlock = {
  type: string;
  style: string | null;
  size: string | null;
  nth: number;
  items: number;
  statuses: string[];
};

/** Each slide's blocks, in order, as `path` (a print view) draws them. */
export async function printedBlocks(
  page: Page,
  path = "/print",
): Promise<PrintedBlock[][]> {
  await page.goto(path);
  return page.locator("[data-print-page]").evaluateAll((pages) =>
    pages.map((printed) => {
      const seen = new Map<string, number>();
      return [...printed.querySelectorAll<HTMLElement>("[data-block]")].map(
        (block) => {
          const type = block.dataset.block!;
          const nth = seen.get(type) ?? 0;
          seen.set(type, nth + 1);
          const list = block.querySelector("ol, ul");
          const entries = list ? [...list.querySelectorAll(":scope > li")] : [];
          return {
            type,
            style:
              block
                .querySelector("[data-style]:is(ol, ul)")
                ?.getAttribute("data-style") ?? null,
            size:
              block.querySelector("[data-size]")?.getAttribute("data-size") ??
              null,
            nth,
            items: entries.length,
            statuses: entries.flatMap((li) => {
              const status = li.getAttribute("data-status");
              return status ? [status] : [];
            }),
          };
        },
      );
    }),
  );
}

/** The first slide (1-based) from `from` on whose blocks one matches, and
 *  that block; or null. */
export async function findBlock(
  page: Page,
  match: (block: PrintedBlock) => boolean,
  from = 0,
): Promise<{ n: number; block: PrintedBlock } | null> {
  const slides = await printedBlocks(page);
  for (let i = from; i < slides.length; i++) {
    const block = slides[i].find(match);
    if (block) return { n: i + 1, block };
  }
  return null;
}

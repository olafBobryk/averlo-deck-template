// Types for constants.mjs, so the TypeScript specs can import it.

export type Layout = {
  motion: string;
  swipe: string;
  fog: string;
  intro: string;
  lock: string;
  gateCss: string;
  boot: string;
  bootCss: string;
};

export const layouts: { origin: Layout; template: Layout };

/** The motion, swipe, intro and boot constants of the tree at `root`. */
export function extract(root: string, layout?: Layout): Record<string, unknown>;

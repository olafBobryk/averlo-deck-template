// Small helpers for the documentation specs: read a repository file, split
// markdown into sections, and make GitHub-style heading anchors.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));

export const exists = (path: string) => existsSync(join(root, path));
export const read = (path: string) => readFileSync(join(root, path), "utf8");

/** Text outside fenced code blocks, so a `#` comment is not a heading. */
function lines(markdown: string) {
  const out: { text: string; code: boolean }[] = [];
  let code = false;
  for (const text of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(text)) code = !code;
    out.push({ text, code });
  }
  return out;
}

export type Section = { level: number; title: string; body: string };

/** Every heading with the text under it, up to the next heading of the same
 *  or a higher level. */
export function sections(markdown: string): Section[] {
  const all = lines(markdown);
  const found: Section[] = [];
  all.forEach(({ text, code }, i) => {
    const match = !code && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(text);
    if (!match) return;
    const level = match[1].length;
    const body: string[] = [];
    for (const next of all.slice(i + 1)) {
      const heading = !next.code && /^(#{1,6})\s/.exec(next.text);
      if (heading && heading[1].length <= level) break;
      body.push(next.text);
    }
    found.push({ level, title: match[2], body: body.join("\n") });
  });
  return found;
}

/** The anchor GitHub gives a heading. */
export function anchor(title: string) {
  return title
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

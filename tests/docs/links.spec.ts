import { dirname, join, normalize } from "node:path";
import { expect, test } from "@playwright/test";
import { anchor, exists, read, sections } from "./markdown";

// The documents a deck owner and an agent follow (T039, T040): every
// relative link resolves to a file, and every `#anchor` to a heading in it.
// The workflow menu names each procedure and links it. No browser, no server.

const DOCS = [
  "README.md",
  "WORKFLOWS.md",
  "AGENTS.md",
  "process/workflows.md",
  "docs/orchestration.md",
  "docs/licences.md",
];

const anchorsOf = (path: string) =>
  new Set(sections(read(path)).map((s) => anchor(s.title)));

function links(path: string) {
  const text = read(path).replace(/```[\s\S]*?```/g, "");
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((href) => !/^[a-z]+:/i.test(href));
}

test.describe("documentation links", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  for (const doc of DOCS) {
    test(`${doc}: every relative link resolves`, () => {
      expect(exists(doc), `${doc} exists`).toBe(true);
      for (const href of links(doc)) {
        const [file, hash] = href.split("#");
        const target = file ? normalize(join(dirname(doc), file)) : doc;
        expect(exists(target), `${doc} links ${href}`).toBe(true);
        if (hash && target.endsWith(".md")) {
          expect([...anchorsOf(target)], `${doc} links ${href}`).toContain(
            hash,
          );
        }
      }
    });
  }

  test("the workflow menu links every procedure, by name only", () => {
    const procedures = sections(read("process/workflows.md"))
      .filter((s) => s.level === 2)
      .map((s) => anchor(s.title));
    expect(procedures).toContain("draft-a-deck-from-any-source");
    expect(procedures).toContain("port-the-design-system");
    const menu = links("WORKFLOWS.md")
      .filter((href) => href.startsWith("process/workflows.md#"))
      .map((href) => href.split("#")[1]);
    expect(menu.sort()).toEqual([...procedures].sort());
  });
});

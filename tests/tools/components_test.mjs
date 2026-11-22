// The deck's components (feature 003, T310): each block's renderer is a
// named, typed component in the template-owned src/components/deck/,
// exported from its index, so a slide file imports it from
// `@/components/deck`; the block switch (src/deck/SlideBody.tsx) and the
// preset view (src/presets/index.ts) draw blocks through them; and they
// take their colours from the Averlo tokens only.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dir = join(root, "src", "components", "deck");
const read = (path) => readFileSync(join(root, path), "utf8");

export const components = [
  "Points",
  "Steps",
  "Facts",
  "Org",
  "Fork",
  "Week",
  "Plan",
  "Lead",
  "Note",
  "Chart",
  "Stat",
  "Flow",
  "Timeline",
  "Cycle",
  "OrgChart",
  "Table",
  "Matrix",
  "Quote",
  "Agenda",
  "Compare",
  "Image",
  "ImageGrid",
];

/** Every file under `folder`, recursively. */
const files = (folder) =>
  existsSync(folder)
    ? readdirSync(folder).flatMap((name) => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? files(path) : [path];
      })
    : [];

describe("src/components/deck", () => {
  const index = existsSync(join(dir, "index.ts"))
    ? readFileSync(join(dir, "index.ts"), "utf8")
    : "";

  for (const name of components)
    test(`exports ${name} from its index`, () => {
      assert.match(
        index,
        new RegExp(`export \\{[^}]*\\b${name}\\b[^}]*\\} from "\\./`),
        `src/components/deck/index.ts exports ${name}`,
      );
    });

  test("every component is a named function with typed props", () => {
    const source = files(dir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    for (const name of components)
      assert.match(
        source,
        new RegExp(`export function ${name}\\((\\{[^}]*\\}|props): `),
        `${name} is \`export function ${name}(…: Props)\``,
      );
  });

  test("no colour literal appears in src/components/deck/", () => {
    const literal = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
    const all = files(dir);
    assert.ok(all.length > 0, "src/components/deck/ has files");
    for (const file of all)
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) =>
          assert.ok(!literal.test(line), `${file}:${i + 1}: ${line.trim()}`),
        );
  });

  test("no component takes the deck's Text objects", () => {
    for (const file of files(dir))
      assert.doesNotMatch(
        readFileSync(file, "utf8"),
        /from "@\/deck\/(model|content)"/,
        `${file} imports the data model`,
      );
  });
});

describe("the block switch delegates to the components", () => {
  test("src/deck/SlideBody.tsx draws its blocks with @/components/deck", () => {
    const source = read("src/deck/SlideBody.tsx");
    assert.match(source, /from "@\/components\/deck"/);
    for (const name of [
      "Lead",
      "Note",
      "Points",
      "Steps",
      "Facts",
      "Org",
      "Fork",
      "Week",
      "Plan",
    ])
      assert.match(
        source,
        new RegExp(`<${name}\\b`),
        `SlideBody draws <${name}>`,
      );
  });

  test("src/presets/index.ts draws the presets with @/components/deck", () => {
    const source = read("src/presets/index.ts");
    assert.match(source, /from "@\/components\/deck"/);
  });

  test("the ported src/components/ui/ holds no template file", () => {
    const lock = JSON.parse(read("scripts/ports.lock.json"));
    const ported = new Set(
      lock.sources.flatMap((s) => s.files.map((f) => f.target)),
    );
    for (const file of files(join(root, "src", "components", "ui"))) {
      const rel = file.slice(root.length).replace(/^\//, "");
      assert.ok(ported.has(rel), `${rel} is not a port`);
    }
  });
});

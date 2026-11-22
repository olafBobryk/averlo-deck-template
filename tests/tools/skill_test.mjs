// Unit tests for the deck-visuals skill (feature 002, T140; FR-006,
// research D5). The skill ships twice, for Claude Code
// (.claude/skills/deck-visuals/) and for Codex (.agents/skills/deck-visuals/),
// and the two copies are byte-identical. Its preset reference,
// references/presets.md, is generated from the registry and each preset's
// example file (src/presets/slides/) by scripts/presets-doc.mjs, so it never
// drifts from the presets. Every preset
// in the registry is named in SKILL.md's selection rules.
//
// Feature 003 (T340): a preset is an example slide file, so the skill names
// every preset file by its path, and drafts slide files (src/slides/), with
// the owner's words in `copy`, never data blocks.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { registry } from "../../src/presets/registry.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const copies = {
  claude: join(root, ".claude/skills/deck-visuals"),
  codex: join(root, ".agents/skills/deck-visuals"),
};

/** Every file under `dir`, as paths relative to it, sorted. */
function files(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (at) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path));
    }
  };
  walk(dir);
  return out.sort();
}

const read = (path) => readFileSync(path, "utf8");

/** SKILL.md's "Selection rules" section: from its heading to the next
 *  heading of the same level. */
function selectionRules(skill) {
  const lines = skill.split("\n");
  const start = lines.findIndex((line) => /^##\s+Selection rules\b/.test(line));
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return rest.slice(0, end < 0 ? undefined : end).join("\n");
}

describe("the deck-visuals skill", () => {
  for (const [agent, dir] of Object.entries(copies)) {
    test(`the ${agent} copy has SKILL.md and references/presets.md`, () => {
      const found = files(dir);
      assert.ok(found.includes("SKILL.md"), `${dir}/SKILL.md`);
      assert.ok(
        found.includes(join("references", "presets.md")),
        `${dir}/references/presets.md`,
      );
    });
  }

  test("the Claude and Codex copies are byte-identical", () => {
    const claude = files(copies.claude);
    assert.ok(claude.length > 0, "the Claude copy has files");
    assert.deepEqual(files(copies.codex), claude, "the same files");
    for (const path of claude)
      assert.ok(
        readFileSync(join(copies.claude, path)).equals(
          readFileSync(join(copies.codex, path)),
        ),
        `${path} differs between the copies`,
      );
  });

  test("SKILL.md's frontmatter names the skill and says when to use it", () => {
    const skill = read(join(copies.claude, "SKILL.md"));
    const front = /^---\n([\s\S]*?)\n---\n/.exec(skill);
    assert.ok(front, "SKILL.md starts with a frontmatter block");
    assert.match(front[1], /^name: "?deck-visuals"?$/m);
    const description = /^description: (.+)$/m.exec(front[1]);
    assert.ok(description, "a description line");
    assert.match(description[1], /draft/i);
    assert.match(description[1], /slide/i);
  });

  test("references/presets.md is the output of scripts/presets-doc.mjs", async () => {
    const { presetsDoc } = await import("../../scripts/presets-doc.mjs");
    const expected = presetsDoc(registry);
    for (const [agent, dir] of Object.entries(copies)) {
      const path = join(dir, "references", "presets.md");
      assert.ok(existsSync(path), `${agent}: ${path}`);
      assert.equal(
        read(path),
        expected,
        `${agent}: run npm run presets:doc to regenerate it`,
      );
    }
  });

  test("the generated reference gives every preset's name, family, block, fits and example file", async () => {
    const { presetsDoc } = await import("../../scripts/presets-doc.mjs");
    const doc = presetsDoc(registry);
    for (const entry of registry) {
      assert.ok(doc.includes(`### ${entry.name}\n`), entry.name);
      assert.ok(doc.includes(entry.fits), `${entry.name}: fits`);
      assert.ok(doc.includes(`\`${entry.block}\``), `${entry.name}: block`);
      // Its example file, by path and in full (feature 003, T331).
      const file = `src/presets/slides/${entry.file}.tsx`;
      assert.ok(doc.includes(`\`${file}\``), `${entry.name}: file`);
      assert.ok(
        doc.includes(read(join(root, file)).trim()),
        `${entry.name}: the example file's source`,
      );
    }
  });

  test("every registry preset is named in SKILL.md's selection rules", () => {
    const rules = selectionRules(read(join(copies.claude, "SKILL.md")));
    assert.ok(rules.trim(), "SKILL.md has a Selection rules section");
    const missing = registry
      .map((entry) => entry.name)
      .filter((name) => !rules.includes(name));
    assert.deepEqual(missing, [], "presets missing from the selection rules");
  });

  test("SKILL.md names every preset file and its path", () => {
    const skill = read(join(copies.claude, "SKILL.md"));
    const rules = selectionRules(skill);
    const missing = registry
      .map((entry) => `src/presets/slides/${entry.file}.tsx`)
      .filter((path) => !rules.includes(`\`${path}\``));
    assert.deepEqual(
      missing,
      [],
      "preset files missing from the selection rules",
    );
    const folder = join(root, "src", "presets", "slides");
    const files = [
      ...readdirSync(folder)
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => `src/presets/slides/${name}`),
      ...readdirSync(join(folder, "composed")).map(
        (name) => `src/presets/slides/composed/${name}`,
      ),
    ];
    assert.ok(files.length > registry.length, "the preset folder has files");
    const unnamed = files.filter((path) => !skill.includes(`\`${path}\``));
    assert.deepEqual(unnamed, [], "preset files SKILL.md does not name");
  });

  test("SKILL.md drafts slide files with the owner's words in copy, not data", () => {
    const skill = read(join(copies.claude, "SKILL.md"));
    for (const word of ["src/slides/", "`copy`", "@/components/deck", "NN-"])
      assert.ok(skill.includes(word), `SKILL.md names ${word}`);
    for (const gone of [
      "src/deck/slides.ts",
      "src/deck/content.ts",
      "src/presets/validate.ts",
      "src/deck/visuals/index.ts",
      'type: "custom"',
      "DeckVisualProps",
    ])
      assert.ok(!skill.includes(gone), `SKILL.md still names ${gone}`);
  });
});

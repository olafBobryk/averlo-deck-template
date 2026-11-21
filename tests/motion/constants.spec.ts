import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { extract, layouts } from "../baseline/constants.mjs";
import { motionTokens, reducedMotionTokens } from "../../src/motion/motion";

// The timing constants, compared exactly (research R8, SC-003): the
// template's motion module, the swipe constants, the intro timing and the
// hard-load screen's timing equal the baseline recorded from the origin
// (references/strips/constants.json), read by the same extractor from the
// template's own tree. And the motion module carries none of the origin
// product's screen-switch, registry or config code. No browser, no server.

const root = fileURLToPath(new URL("../../", import.meta.url));
const baseline = JSON.parse(
  readFileSync(
    join(root, "specs/001-deck-template/references/strips/constants.json"),
    "utf8",
  ),
) as Record<string, Record<string, unknown>>;

test.describe("timing constants", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  test("the template's tree yields the baseline's constants", () => {
    expect(extract(root, layouts.template)).toEqual(baseline);
  });

  test("the motion module's tokens, as it exports them, are the baseline's", () => {
    const motion = baseline.motion;
    // Through JSON, as the baseline was written: numbers and arrays only.
    expect(JSON.parse(JSON.stringify(motionTokens))).toEqual(
      motion.motionTokens,
    );
    expect(JSON.parse(JSON.stringify(reducedMotionTokens))).toEqual(
      motion.reducedMotionTokens,
    );
  });
});

/** Import paths that reach the origin product's screen-switch, registry and
 *  config code (detached in P1). */
const blocked = [
  "lib/frames",
  "lib/gaps",
  "lib/api",
  "frames.generated",
  "release1",
  "route-key",
];

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(m?[jt]sx?|css)$/.test(entry.name) ? [path] : [];
  });
}

/** Every module specifier a file imports: static, dynamic, re-exported,
 *  required, or a CSS @import. */
const specifiers = (text: string) =>
  [
    ...text.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|@import\s+(?:url\()?\s*)["']([^"']+)["']/g,
    ),
  ].map((m) => m[1]);

test("no file under src/ imports the product's screen-switch, registry or config code", ({}, info) => {
  test.skip(info.project.name !== "desktop", "no browser; runs once");
  const files = sources(join(root, "src"));
  expect(files.length, "src/ holds the deck's sources").toBeGreaterThan(0);
  const found = files.flatMap((file) =>
    specifiers(readFileSync(file, "utf8"))
      .filter((spec) => blocked.some((part) => spec.includes(part)))
      .map((spec) => `${relative(root, file)}: ${spec}`),
  );
  expect(found).toEqual([]);
});

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

// Opt-in motion evidence: with EVIDENCE=1 the motion tests
// write the frames they already sample to the feature's references/strips/,
// one small JSON per strip and viewport. Off by default: no files.
const dir = fileURLToPath(
  new URL("../specs/001-deck-template/references/strips/", import.meta.url),
);

/** Rounds every number to 0.1 so the strips stay small and diffable. */
const round = (_key: string, value: unknown) =>
  typeof value === "number" ? Math.round(value * 10) / 10 : value;

export function evidence(name: string, data: unknown) {
  if (process.env.EVIDENCE !== "1") return;
  const project = test.info().project.name;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}${name}-${project}.json`,
    `${JSON.stringify(
      {
        strip: name,
        viewport: test.info().project.use.viewport,
        test: test.info().titlePath.slice(1).join(" › "),
        recorded: new Date().toISOString().slice(0, 10),
        data,
      },
      round,
      1,
    )}\n`,
  );
}

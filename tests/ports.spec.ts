import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// No design-source code of the origin product remains (FR-010): the
// temporary design files that P1 used from src/_origin-temp/ are replaced by
// the Averlo ports (T025) and deleted (T026). Expected to fail until T026.
// No browser, no server.

const root = fileURLToPath(new URL("../", import.meta.url));

test("no temporary design files remain in src/_origin-temp/ (fails until T026)", ({}, info) => {
  test.skip(info.project.name !== "desktop", "no browser; runs once");
  expect(
    existsSync(join(root, "src", "_origin-temp")),
    "src/_origin-temp/ exists; T025 replaces its files and T026 deletes it",
  ).toBe(false);
});

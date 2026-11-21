import { defineConfig } from "@playwright/test";
import smoke from "./playwright.config";

// The motion strips (research R8): the baseline recording and the replay
// diff, at the smoke config's two viewports. No web server: the specs read
// ORIGIN_URL (recording) and TARGET_URL (replay), which the gate serves. One
// worker and no tracing, so nothing else competes for the frames.
export default defineConfig({
  testDir: "tests",
  testMatch: ["baseline/record.spec.ts", "motion/strips.spec.ts"],
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  retries: 0,
  reporter: [["list"]],
  use: { trace: "off" },
  projects: smoke.projects,
});

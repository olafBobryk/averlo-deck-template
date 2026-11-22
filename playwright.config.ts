import { defineConfig, devices } from "@playwright/test";

// Smoke runs against a local production build: `npm run build`
// (site + PDFs) then `next start`. The deck has no access key.
// SMOKE_SERVER=external leaves the server to the caller: `npm run
// check:deck` builds once and starts the server its specs need itself.
const port = Number(process.env.SMOKE_PORT ?? 3198);
const external = process.env.SMOKE_SERVER === "external";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run build && npx next start --hostname 127.0.0.1 --port ${port}`,
        url: `http://127.0.0.1:${port}/print`,
        timeout: 300_000,
        reuseExistingServer: false,
      },
});

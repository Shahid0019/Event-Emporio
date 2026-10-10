import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
/** Set PW_CHANNEL=msedge or chrome to use an installed browser instead of Playwright's Chromium. */
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  // The dev server compiles routes on first visit, so allow generous assertion timeouts.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
});

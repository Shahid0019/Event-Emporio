import { defineConfig, devices } from "@playwright/test";

// Admin tests sign in with ADMIN_EMAIL / ADMIN_PASSWORD from .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no local env file */
}

/**
 * By default the tests start their own dev server on port 3100 with a separate,
 * freshly reset database (scripts/e2e-server.mjs), so they never touch your data.
 * Set E2E_BASE_URL to test an already running site instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
/** Set PW_CHANNEL=msedge or chrome to use an installed browser instead of Playwright's Chromium. */
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // One dev server serves every test; more workers than this mostly adds waiting.
  workers: 3,
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
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "node scripts/e2e-server.mjs", url: baseURL, reuseExistingServer: false, timeout: 180_000 },
  projects: [
    // Compiles the main routes once before the tests (see tests/e2e/warmup.setup.ts).
    { name: "warmup", testMatch: /warmup\.setup\.ts/, use: { ...devices["Desktop Chrome"], channel } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel }, dependencies: ["warmup"] },
    { name: "mobile", use: { ...devices["Pixel 7"], channel }, dependencies: ["warmup"] },
  ],
});

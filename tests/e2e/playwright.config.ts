/**
 * Playwright configuration for deephaven-plugin-notification E2E tests.
 *
 * tests/tier1/ — browser tests of the built bundle, loaded the way Deephaven
 * loads it. MUST pass. No Deephaven server required; the harness static server
 * (port 19877) is started automatically by `webServer` below.
 *
 * Run commands (from tests/e2e/):
 *   npm test              # all tests
 *   npm run test:tier1    # tier1 only (MUST pass gate)
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 19877;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],

  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },

  webServer: {
    command: `node harness/server.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },

  projects: [
    {
      name: "tier1",
      testMatch: "**/tier1/**/*.spec.ts",
    },
  ],
});

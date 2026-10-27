import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  // Keep the reporter and stop the run before the job timeout.
  globalTimeout: 15 * 60 * 1000,
  expect: {timeout: isCI ? 10_000 : 5_000},
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // CI already ran `npm run build`; use the production server so the first
    // sign-up does not wait for Next.js to compile routes on demand.
    command: isCI ? "npm run start:standalone" : "npm run dev",
    // The suite creates several accounts in one run, so the server it starts
    // must not rate-limit auth. A server you started yourself keeps its own
    // settings; restart it with the same variable to reproduce CI locally.
    env: {E2E_DISABLE_AUTH_RATE_LIMIT: "true"},
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

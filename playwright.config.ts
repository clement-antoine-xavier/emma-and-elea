import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["instant/**"],
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Tests create isolated users and organizations, so two workers are safe.
  timeout: 60_000,
  workers: 2,
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
    // Always run a production build so tests never wait for on-demand route
    // compilation. CI builds once before the job; locally the server command
    // builds the bundle first.
    command: isCI
      ? "npm run start:standalone"
      : "npm run build && npm run start:standalone",
    // The suite creates several accounts in one run, so the server it starts
    // must not rate-limit auth. A server you started yourself keeps its own
    // settings; restart it with the same variable to reproduce CI locally.
    env: {
      E2E_DISABLE_AUTH_RATE_LIMIT: "true",
      ASSISTANT_ENABLED: process.env.ASSISTANT_ENABLED ?? "",
      ASSISTANT_FAKE_MODEL: process.env.ASSISTANT_FAKE_MODEL ?? "",
      ALLOW_ASSISTANT_TEST_MODEL:
        process.env.ALLOW_ASSISTANT_TEST_MODEL ?? "",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

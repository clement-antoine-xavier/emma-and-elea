import "dotenv/config";
import {defineConfig, devices} from "@playwright/test";

/**
 * Instant Navigation baseline. Build with `npm run build:test` first: the
 * testing API and the scripted assistant model only exist in that build.
 * A separate port keeps this suite away from a running dev server.
 */
export default defineConfig({
  testDir: "./e2e/instant",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  globalTimeout: 10 * 60 * 1000,
  expect: {timeout: process.env.CI ? 10_000 : 5_000},
  reporter: process.env.CI ? [["github"], ["html", {open: "never"}]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "instant",
      use: {...devices["Desktop Chrome"]},
    },
  ],
  webServer: {
    command: "PORT=3100 npm run start:standalone",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: "http://localhost:3100",
      E2E_DISABLE_AUTH_RATE_LIMIT: "true",
      ASSISTANT_ENABLED: "true",
      ASSISTANT_FAKE_MODEL: "echo",
      ALLOW_ASSISTANT_TEST_MODEL: "1",
    },
  },
});

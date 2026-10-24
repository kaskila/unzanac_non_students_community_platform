import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, e2eEnv } from "./tests/e2e/env";

// E2E tests run against a production build (`npm run build` first), at phone size,
// on a separate database that is reset before every run (tests/e2e/global-setup.ts).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Server-rendered admin steps (sign-in, 2FA, uploads) can take several seconds on a busy machine.
  expect: { timeout: 10_000 },
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: false, hasTouch: true },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: e2eEnv,
  },
});

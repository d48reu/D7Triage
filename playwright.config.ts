import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = 3137;
const baseURL = `http://localhost:${port}`;
const dataDir = path.join(
  os.tmpdir(),
  `district-7-playwright-${process.pid}`,
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "front-desk-edge-size",
      use: {
        ...devices["Desktop Edge"],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/staff/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      STAFF_PASSWORD: "e2e-staff-password",
      STAFF_SESSION_SECRET: "e2e-session-secret-for-isolated-browser-tests",
      GEOCODING_PROVIDER: "none",
      AUTOMATED_BACKUPS_ENABLED: "false",
      OFFSITE_BACKUPS_ENABLED: "false",
      STAFF_ASSIGNMENT_EMAIL_ENABLED: "false",
      AI_ROUTING_ENABLED: "false",
      REPORT_RATE_LIMIT_ENABLED: "false",
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});

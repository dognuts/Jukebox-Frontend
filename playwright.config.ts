import { defineConfig, devices } from "@playwright/test"

// Playwright config for Jukebox frontend e2e.
// Tests mock the Go backend via page.route('**/api/**') — no real backend
// or database is required to run them.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // stdout visibility helps diagnose when the dev server fails to start
    stdout: "pipe",
    stderr: "pipe",
  },
})

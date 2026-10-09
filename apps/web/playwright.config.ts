import { defineConfig, devices } from "@playwright/test";

// End-to-end: a real browser, the production build, Postgres, S3Mock and the QStash dev
// server, with the fake AI provider. Locally: `pnpm db:up && pnpm build && pnpm --filter web test:e2e`.
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // "restyle-e2e" keeps test runs out of the field metrics (api/vitals drops it).
      // channel "chrome": the installed Google Chrome (preinstalled on GitHub runners, already
      // used by Lighthouse CI), so no separate browser download.
      use: { ...devices["Desktop Chrome"], channel: "chrome", userAgent: `${devices["Desktop Chrome"].userAgent} restyle-e2e` },
    },
  ],
  webServer: [
    {
      command: "npx @upstash/qstash-cli@2.40.12 dev -port 8180",
      port: 8180,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm start",
      url: `${baseURL}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});

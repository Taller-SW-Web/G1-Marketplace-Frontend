import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "checkout.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    channel: "msedge",
  },
  webServer: {
    command: "npm run dev -- --port 3101 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3101/checkout",
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

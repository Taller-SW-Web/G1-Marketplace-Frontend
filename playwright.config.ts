import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: "**/wishlist/**",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node ../G1-Marketplace-Backend/src/server.js",
      url: "http://127.0.0.1:10100/api/v1/catalog/home",
      env: {
        CATALOG_SOURCE: "mock",
        PORT: "10100",
        HOST: "127.0.0.1",
        NODE_ENV: "development",
      },
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --port 3100 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3100",
      env: {
        MARKETPLACE_API_URL: "http://127.0.0.1:10100",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});

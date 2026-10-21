import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // Wishlist uses its explicit sandbox configs, kept outside this default suite.
  testIgnore: ["**/wishlist/**", "**/auth/**"],
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm --prefix ../G1-Marketplace-Backend run build && npm --prefix ../G1-Marketplace-Backend run start:prod",
      url: "http://127.0.0.1:10100/live",
      env: {
        CATALOG_SOURCE: "mock",
        BFF_MODE: "mock",
        USE_MOCKS: "true",
        H3_SANDBOX_ENABLED: "false",
        H3_AUTH_MOCK: "false",
        ORDERS_SOURCE: "unconfigured",
        PORT: "10100",
        DATABASE_URL: "postgresql://test:test@127.0.0.1:1/catalog_ui_tests?schema=public",
        CORS_ORIGINS: "http://127.0.0.1:3100",
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
      timeout: 120000,
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

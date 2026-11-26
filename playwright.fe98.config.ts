import { defineConfig } from "@playwright/test";

/** Isolated FE #98 demo: local catalog fixture plus browser-stubbed cart/favorites. */
export default defineConfig({
  testDir: "./tests",
  testMatch: "fe98-second-demo.e2e.spec.ts",
  outputDir: "test-results/fe98-second-demo",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3210",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm --prefix ../G1-Marketplace-Backend run build && npm --prefix ../G1-Marketplace-Backend run start:prod",
      url: "http://127.0.0.1:10110/live",
      env: {
        CATALOG_SOURCE: "mock",
        BFF_MODE: "mock",
        USE_MOCKS: "true",
        H3_SANDBOX_ENABLED: "false",
        H3_AUTH_MOCK: "false",
        ORDERS_SOURCE: "unconfigured",
        PORT: "10110",
        DATABASE_URL: "postgresql://test:test@127.0.0.1:1/catalog_ui_tests?schema=public",
        CORS_ORIGINS: "http://127.0.0.1:3210",
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 3210 --hostname 127.0.0.1 --webpack",
      url: "http://127.0.0.1:3210/catalogo",
      env: {
        MARKETPLACE_API_URL: "http://127.0.0.1:10110",
        H3_FRONTEND_SANDBOX_ENABLED: "true",
        H3_FRONTEND_ORIGIN: "http://127.0.0.1:3210",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});

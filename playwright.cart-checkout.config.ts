import { defineConfig } from "@playwright/test";

process.env.CHECKOUT_MODE = process.env.CHECKOUT_MODE || "backend-mock";
process.env.NEXT_PUBLIC_CHECKOUT_MODE = process.env.NEXT_PUBLIC_CHECKOUT_MODE || "backend-mock";
process.env.MOCK_SALES_OUTCOME = process.env.MOCK_SALES_OUTCOME || "PAID";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["catalog-cart-integration.e2e.spec.ts", "checkout.spec.ts"],
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
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      CHECKOUT_MODE: "backend-mock",
      NEXT_PUBLIC_CHECKOUT_MODE: "backend-mock",
      MOCK_SALES_OUTCOME: "PAID",
      MARKETPLACE_API_URL: "http://127.0.0.1:10000",
      MOCK_AUTH_URL: "http://127.0.0.1:4010",
    },
    reuseExistingServer: false,
    timeout: 120000,
  },
});

import { defineConfig } from "@playwright/test";

// E2E_PROD=1: next build + next start (modo fixtures), para comprobar la CSP de producción.
const server = process.env.E2E_PROD ? "npm run build && npm run start --" : "npm run dev --";

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
    // Checkout backend-mock routes are intentionally disabled under NODE_ENV=production.
    command: `${server} --port 3101 --hostname 127.0.0.1`,
    url: "http://127.0.0.1:3101/checkout",
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: process.env.E2E_PROD ? 420000 : 120000,
  },
});

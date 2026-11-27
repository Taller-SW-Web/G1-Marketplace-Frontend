import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["wishlist/views.spec.ts", "diego-closure/csat.spec.ts"],
  workers: 1, timeout: 30000, reporter: "list",
  outputDir: "test-results/diego-closure",
  use: { baseURL: "http://127.0.0.1:3347", browserName: "chromium", channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "npm run dev -- --port 3347 --hostname 127.0.0.1 --webpack",
    url: "http://127.0.0.1:3347/demo/h3/evaluacion", reuseExistingServer: false, timeout: 120000,
    env: { G1_AUTH_ENABLED: "false", H3_FRONTEND_SANDBOX_ENABLED: "true", H3_FRONTEND_ORIGIN: "http://127.0.0.1:3347",
      H3_WISHLIST_READ_ENABLED: "true", H3_WISHLIST_CART_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" },
  },
});

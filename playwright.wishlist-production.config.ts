import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/wishlist", testMatch: "production.spec.ts", workers: 1,
  outputDir: "test-results/wishlist-production", reporter: "list",
  use: { baseURL: "http://127.0.0.1:3300", channel: "msedge", trace: "off", video: "off" },
  webServer: { command: "npm run start -- --port 3300 --hostname 127.0.0.1", url: "http://127.0.0.1:3300",
    env: { NODE_ENV: "production", H3_FRONTEND_SANDBOX_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" }, reuseExistingServer: false, timeout: 60000 },
});

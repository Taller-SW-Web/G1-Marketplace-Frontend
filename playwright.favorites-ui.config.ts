import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/wishlist", testMatch: "views.spec.ts", workers: 1, timeout: 30000,
  outputDir: "test-results/favorites-ui", reporter: "list",
  use: { baseURL: "http://127.0.0.1:3200", browserName: "chromium", channel: "msedge", trace: "off", video: "off", screenshot: "only-on-failure" },
  webServer: {
    command: "npm run dev -- --port 3200 --webpack", url: "http://127.0.0.1:3200/demo/h3/favoritos/lista",
    env: { H3_FRONTEND_SANDBOX_ENABLED: "true", H3_FRONTEND_ORIGIN: "http://127.0.0.1:3200", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: true, timeout: 120000,
  },
});

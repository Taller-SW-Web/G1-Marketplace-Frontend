import { defineConfig } from "@playwright/test";
const connected = process.env.H3_CONNECTED === "true";
export default defineConfig({
  testDir: "./tests/wishlist",
  testMatch: connected ? "connected.spec.ts" : "mock.spec.ts",
  fullyParallel: false, workers: 1, timeout: 45000,
  outputDir: "test-results/wishlist",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/wishlist", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3200", browserName: "chromium", channel: "msedge",
    trace: "off", video: "off", screenshot: "only-on-failure" },
  ...(connected ? {} : { webServer: {
    command: "npm run dev -- --port 3200 --webpack", url: "http://127.0.0.1:3200/demo/h3/favoritos",
    env: { H3_FRONTEND_SANDBOX_ENABLED: "true", H3_FRONTEND_ORIGIN: "http://127.0.0.1:3200", H3_SANDBOX_TOKEN_A: "mock-http-A", H3_SANDBOX_TOKEN_B: "mock-http-B", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false, timeout: 120000,
  } }),
});

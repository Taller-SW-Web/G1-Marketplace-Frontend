import { defineConfig } from "@playwright/test";

// Keyboard/UI contract checks. No BFF, G7 account, token or database is used.
export default defineConfig({
  testDir: "./tests/auth", testMatch: "accessibility.spec.ts", workers: 1,
  timeout: 30000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3002", browserName: "chromium", channel: process.env.CI ? undefined : "msedge", trace: "off" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3002",
    url: "http://127.0.0.1:3002/login", reuseExistingServer: false,
    env: { G1_AUTH_ENABLED: "true", G1_WEB_ORIGIN: "http://127.0.0.1:3002", MARKETPLACE_API_URL: "http://127.0.0.1:1",
      H3_FRONTEND_SANDBOX_ENABLED: "false", G1_TERMS_URL: "https://example.test/terms", G1_PRIVACY_URL: "https://example.test/privacy" },
  },
});

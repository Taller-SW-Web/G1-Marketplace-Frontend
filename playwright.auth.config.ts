import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/auth", testMatch: "*.spec.ts", workers: 1,
  timeout: 60000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3002", browserName: "chromium", channel: process.env.CI ? undefined : "msedge", trace: "off" },
});

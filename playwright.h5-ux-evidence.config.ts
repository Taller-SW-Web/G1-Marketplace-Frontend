import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/h5",
  testMatch: "ux-evidence.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3115",
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --webpack --port 3115",
    url: "http://127.0.0.1:3115/carrito",
    env: { H5_CART_OVERLAY_QA: "true", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 120000,
  },
});

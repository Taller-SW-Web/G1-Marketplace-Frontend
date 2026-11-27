import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/h5",
  testMatch: "reordenado-evidence.spec.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3116", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --webpack --port 3116",
    url: "http://127.0.0.1:3116/mis-pedidos",
    reuseExistingServer: false,
    env: { REORDER_UI_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" },
    timeout: 120000,
  },
});

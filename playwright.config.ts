import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // F-006/F-007 (PR #11 de Giuliano): catalog.spec.ts y figma-h3.spec.ts
  // ejercitan GET /home y GET /products del BFF, aún no fusionados en
  // develop. Se reincorporan al fusionar ese PR.
  testIgnore: ["**/catalog.spec.ts", "**/figma-h3.spec.ts", "**/wishlist/**"],
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // BFF NestJS en MOCK (F-011): compilado con sus dependencias y
      // verificado por /live. Requiere el repositorio backend como directorio
      // hermano (misma estructura clásica del workspace).
      command:
        "npm --prefix ../G1-Marketplace-Backend ci && npm --prefix ../G1-Marketplace-Backend run build && node ../G1-Marketplace-Backend/dist/main.js",
      url: "http://127.0.0.1:10100/live",
      env: {
        PORT: "10100",
        BFF_MODE: "mock",
        NODE_ENV: "development",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:5432/marketplace_db?schema=public",
      },
      reuseExistingServer: false,
      timeout: 300000,
    },
    {
      command: "npm run start -- --port 3100 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3100",
      env: {
        MARKETPLACE_API_URL: "http://127.0.0.1:10100",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});

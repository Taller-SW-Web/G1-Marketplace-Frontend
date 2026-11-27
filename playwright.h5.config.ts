import { defineConfig } from "@playwright/test";

/**
 * Evidencia H5 (FE #146 / FE #155): V-007 rediseñada, accesibilidad automatizada
 * y capturas de referencia sobre el BFF en modo MOCK.
 *
 * Requiere que `../G1-Marketplace-Backend` tenga su build (`npm run build`) y
 * sirve el frontend con `next dev --webpack` para no depender de un build
 * previo del frontend. Para Lighthouse se usa el servidor de producción
 * (`npm run build && npm run start`), porque medir el dev server no es válido.
 */
const PORT = 3105;

export default defineConfig({
  testDir: "./tests/h5",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/h5" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command:
        "npm --prefix ../G1-Marketplace-Backend run start:prod",
      url: "http://127.0.0.1:10100/live",
      env: {
        CATALOG_SOURCE: "mock",
        BFF_MODE: "mock",
        USE_MOCKS: "true",
        H3_SANDBOX_ENABLED: "false",
        H3_AUTH_MOCK: "false",
        ORDERS_SOURCE: "unconfigured",
        PORT: "10100",
        DATABASE_URL:
          "postgresql://test:test@127.0.0.1:1/catalog_ui_tests?schema=public",
        CORS_ORIGINS: `http://127.0.0.1:${PORT}`,
        NODE_ENV: "test",
      },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${PORT} --hostname 127.0.0.1 --webpack`,
      url: `http://127.0.0.1:${PORT}`,
      env: {
        MARKETPLACE_API_URL: "http://127.0.0.1:10100",
        MARKETPLACE_API_BASE_PATH: "/api/v1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});

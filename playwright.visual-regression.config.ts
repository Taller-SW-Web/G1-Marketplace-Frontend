import { defineConfig } from "@playwright/test";

/**
 * Regresión visual H5 (FE #155): inicio, catálogo y ficha en escritorio y móvil.
 *
 * Usa el BFF en modo MOCK y sirve el frontend con `next dev --webpack` para no
 * exigir un build previo. Las imágenes externas se sustituyen por un SVG local
 * determinista en el spec, de modo que un fallo de red no cambie el snapshot.
 *
 *   npm run test:visual:regression
 *   npm run test:visual:regression:update   (regenerar referencias)
 */
const PORT = 3106;

export default defineConfig({
  testDir: "./tests/visual-regression",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/visual" }],
  ],
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
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
      command: "npm --prefix ../G1-Marketplace-Backend run start:prod",
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

import { defineConfig } from "@playwright/test";

// H5 · E2E de navegador de V-010 Dirección de envío (MOCK).
// Modo backend-mock de la UI; /api/checkout/* y /api/cart/current se responden con page.route
// según el contrato F-022, así que no se necesita Backend, Seguridad ni base de datos.
const port = 3105;
// E2E_PROD=1: next build + next start, para comprobar la CSP de producción (sin unsafe-eval).
const server = process.env.E2E_PROD ? "npm run build && npm run start --" : "npm run dev --";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "direccion-v010.spec.ts", workers: 1,
  timeout: 60000, reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`, browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    // Video sólo con E2E_EVIDENCE=1; se copian únicamente los casos clave.
    trace: "off", video: process.env.E2E_EVIDENCE ? "on" : "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `${server} --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/checkout/direccion`, reuseExistingServer: false, timeout: 420000,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_CHECKOUT_MODE: "backend-mock", CHECKOUT_MODE: "backend-mock" },
  },
});

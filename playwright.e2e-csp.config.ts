import { defineConfig } from "@playwright/test";

// H5 DAST · CSP en modo producción (next build + next start): la política sin 'unsafe-eval'
// es la que se despliega. Recorre las rutas principales y repite el E2E de cuenta (V-001..V-004)
// con csp-guard, que falla ante cualquier violación. MOCK: el BFF se responde con page.route.
const port = 3106;
const g7 = "https://seguridad-g7.example";
process.env.E2E_G7_ORIGIN = g7;
export default defineConfig({
  testDir: "./tests/e2e", testMatch: ["csp-produccion.spec.ts", "cuenta-v001-v004.spec.ts"], workers: 1,
  timeout: 60000, reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`, browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge", trace: "off", video: "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/login`, reuseExistingServer: false, timeout: 420000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1", G1_AUTH_ENABLED: "true", G1_WEB_ORIGIN: `http://127.0.0.1:${port}`,
      MARKETPLACE_API_URL: "http://127.0.0.1:1", H3_FRONTEND_SANDBOX_ENABLED: "false",
      NEXT_PUBLIC_G7_RECOVERY_URL: `${g7}/recuperar-contrasena`,
    },
  },
});

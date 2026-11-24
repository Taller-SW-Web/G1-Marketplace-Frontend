import { defineConfig } from "@playwright/test";

// H5 · E2E de navegador de V-001 a V-004 y cierre de sesión (MOCK).
// Las respuestas del BFF /api/v1/* se simulan con page.route desde los códigos del
// contrato G7; MARKETPLACE_API_URL apunta a un puerto cerrado para que nada salga a la red.
const port = 3104;
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "cuenta-v001-v004.spec.ts", workers: 1,
  timeout: 60000, reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`, browserName: "chromium",
    channel: process.env.CI ? undefined : "msedge",
    // Sin trazas ni HAR: incluirían cuerpos de autenticación. Video sólo con E2E_EVIDENCE=1; se copian únicamente los casos clave.
    trace: "off", video: process.env.E2E_EVIDENCE ? "on" : "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/login`, reuseExistingServer: false, timeout: 180000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1", G1_AUTH_ENABLED: "true", G1_WEB_ORIGIN: `http://127.0.0.1:${port}`,
      MARKETPLACE_API_URL: "http://127.0.0.1:1", H3_FRONTEND_SANDBOX_ENABLED: "false",
      NEXT_PUBLIC_G7_RECOVERY_URL: "http://127.0.0.1:4011/recuperar-contrasena",
    },
  },
});

import { defineConfig } from "@playwright/test";

// E2E_PROD=1: next build + next start (modo fixtures), para comprobar la CSP de producción.
const server = process.env.E2E_PROD ? "npm run build && npm run start --" : "npm run dev --";
// El catálogo sintético del Backend local usa placehold.co; permitirlo solo en el
// servidor E2E opt-in, manteniendo intacta la CSP de producción y sus hosts exactos.
const checkoutImageHosts = process.env.CHECKOUT_MODE === "backend-mock" || process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock"
  ? ["slzglmtiyrzygpkiuthf.supabase.co", "placehold.co"].join(",")
  : undefined;

export default defineConfig({
  testDir: "./tests",
  testMatch: "checkout.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    channel: "msedge",
  },
  webServer: {
    // Checkout backend-mock routes are intentionally disabled under NODE_ENV=production.
    command: `${server} --port 3101 --hostname 127.0.0.1`,
    url: "http://127.0.0.1:3101/checkout",
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      ...(checkoutImageHosts ? { CSP_IMG_HOSTS: checkoutImageHosts } : {}),
    },
    reuseExistingServer: false,
    timeout: process.env.E2E_PROD ? 420000 : 120000,
  },
});

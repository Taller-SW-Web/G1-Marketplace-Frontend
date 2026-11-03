import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const servers = Array.isArray(base.webServer) ? base.webServer : [];
if (servers.length !== 2) throw new Error("FEATURED_REQUIRES_LOCAL_BFF_AND_WEB");

export default defineConfig({
  ...base,
  testDir: "./tests/featured",
  testMatch: "**/*.spec.ts",
  testIgnore: [],
  webServer: [
    { ...servers[0], env: { ...servers[0].env, CATALOG_FEATURED_ENABLED: "true",
      CATALOG_FEATURED_APPROVED: "false", CATALOG_FEATURED_IDS: "mock-product-3,mock-product-1" } },
    { ...servers[1], env: { ...servers[1].env, G1_AUTH_ENABLED: "true", H3_FRONTEND_SANDBOX_ENABLED: "false" } },
  ],
});

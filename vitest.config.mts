import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Reproduce el alias "@/*" de tsconfig.json dentro de Vitest.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "happy-dom",
    include: [
      "tests/components/**/*.test.tsx",
      "tests/catalog/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/components/setup.ts"],
    // Corte H3: las pruebas de F-011 corren contra el adaptador MOCK.
    env: { NEXT_PUBLIC_BFF_MODE: "mock" },
  },
});

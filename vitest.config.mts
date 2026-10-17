import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: [
      // Corte vertical F-016/F-019 (desarrollado en develop).
      "tests/components/**/*.test.tsx",
      // Tests de componentes de F-011 (ficha de producto).
      "tests/catalog/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/components/setup.ts"],
    // Corte H3: las pruebas de F-011 corren contra el adaptador MOCK.
    env: { NEXT_PUBLIC_BFF_MODE: "mock" },
  },
});

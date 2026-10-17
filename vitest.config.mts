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
      "tests/components/**/*.test.{ts,tsx}",
      // Tests de componentes de F-011 (ficha de producto).
      "tests/catalog/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/components/setup.ts"],
  },
});

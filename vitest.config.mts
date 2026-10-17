import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
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

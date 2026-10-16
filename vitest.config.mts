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
    include: ["tests/components/**/*.test.tsx", "tests/routes/**/*.test.ts"],
    setupFiles: ["./tests/components/setup.ts"],
  },
});

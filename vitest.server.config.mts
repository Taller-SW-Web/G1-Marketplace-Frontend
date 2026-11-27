import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)),
    "server-only": fileURLToPath(new URL("./tests/server/server-only.ts", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage/server",
      include: [
        "src/proxy.ts",
        "src/app/api/**/*.ts",
        "src/features/**/*server*.ts",
        "src/shared/**/*.ts",
      ],
      exclude: ["src/**/*.d.ts", "tests/**"],
    },
  },
});

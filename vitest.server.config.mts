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
        // Fronteras del servidor, incluida la ficha que consulta directamente al BFF.
        "src/proxy.ts",
        "src/app/api/**/*.ts",
        "src/app/productos/*/page.tsx",
        "src/features/**/*server*.ts",
        "src/shared/**/*.ts",
        // Clientes, políticas y contratos que ya ejercían las pruebas de servidor de FE #174.
        "src/features/auth/{client,policy}.ts",
        "src/features/checkout/api.ts",
        "src/features/wishlist/{cart-contract,contract,types}.ts",
      ],
      // Declaraciones y fixtures no son código de producción. La UI fuera de este
      // alcance se mide por separado con vitest.config.mts.
      exclude: ["src/**/*.d.ts", "tests/**"],
    },
  },
});

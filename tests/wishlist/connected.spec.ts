import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const backend = resolve(process.cwd(), "../G1-Marketplace-Backend");
function rows() {
  const sql = "SELECT customer_id || ':' || count(*) FROM wishlist_items WHERE product_id = 'PRD-1' AND customer_id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222') GROUP BY customer_id ORDER BY customer_id;";
  return execFileSync("docker", ["compose", "-f", "docker-compose.test.yml", "exec", "-T", "postgres-test", "psql", "-U", "h3_test", "-d", "marketplace_h3_test", "-Atc", sql], { cwd: backend, encoding: "utf8" }).trim();
}

test("REAL local: UI → Next → Nest → PostgreSQL; identity/eligibility MOCK", async ({ page }) => {
  await page.goto("/demo/h3/favoritos");
  const region = page.getByRole("region", { name: "Producto de demostración" });
  await expect(page.getByText("Sin sesión activa.", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "Guardar en favoritos" }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.getByRole("button", { name: "Ahora no" }).click();
  expect(rows()).toBe("");
  // Explicit direct negative proves the server also rejects anonymous mutation.
  expect(await page.evaluate(async () => (await fetch("/api/wishlist/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: "PRD-1" }) })).status)).toBe(401);
  await page.getByLabel("Identidad ficticia").selectOption("A");
  const created = page.waitForResponse(response => response.url().endsWith("/api/wishlist/items") && response.status() === 201);
  await region.getByRole("button", { name: "Guardar en favoritos" }).click(); await created;
  await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toHaveCount(2);
  expect(rows()).toBe("11111111-1111-4111-8111-111111111111:1");
  await page.getByText("Acciones idempotentes de prueba", { exact: true }).click();
  const duplicate = page.waitForResponse(response => response.url().endsWith("/api/wishlist/items") && response.status() === 200);
  await page.getByRole("button", { name: "Repetir POST de PRD-1" }).click(); await duplicate;
  expect(rows()).toBe("11111111-1111-4111-8111-111111111111:1");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `docs/evidencias/h3/favoritos-conectado-${width}.png`, fullPage: true });
  }
  await page.reload();
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).not.toHaveAttribute("aria-pressed");
  expect(rows()).toContain("11111111-1111-4111-8111-111111111111:1");
  await page.getByLabel("Identidad ficticia").selectOption("B");
  await page.getByText("Acciones idempotentes de prueba", { exact: true }).click();
  await page.getByRole("button", { name: "Repetir DELETE de PRD-1" }).click();
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).toHaveAttribute("aria-pressed", "false");
  expect(rows()).toBe("11111111-1111-4111-8111-111111111111:1");
  await region.getByRole("button", { name: "Guardar en favoritos" }).click();
  await expect(region.getByRole("button", { name: "Quitar de favoritos" })).toBeVisible();
  expect(rows()).toContain("22222222-2222-4222-8222-222222222222:1");
  await region.getByRole("button", { name: "Quitar de favoritos" }).click();
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Identidad ficticia").selectOption("A");
  await page.getByRole("button", { name: "Repetir DELETE de PRD-1" }).click();
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).toHaveAttribute("aria-pressed", "false");
  const repeated = page.waitForResponse(response => response.request().method() === "DELETE" && response.status() === 204);
  await page.getByRole("button", { name: "Repetir DELETE de PRD-1" }).click(); await repeated;
  expect(rows()).toBe("");
  for (const name of ["Producto inactivo", "Producto inexistente", "Proveedor no disponible"]) {
    const scenario = page.getByRole("region", { name });
    await scenario.getByRole("button", { name: "Guardar en favoritos" }).click(); await expect(scenario.getByRole("alert")).toBeVisible();
  }
  console.log("PostgreSQL temporal: POST 201 → una fila A; POST 200 → misma fila; DELETE B conserva A; A/B separados; DELETE repetido 204 → cero filas. Negativos 401/404/503 verificados.");
});

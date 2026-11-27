import { expect, test } from "../e2e/csp-guard";

const orderId = "PED-H5-QA-003";
const time = "2026-11-26T00:00:00Z";
const detail = { orderId, state: "DESPACHADO", total: { amount: 50, currency: "PEN" }, createdAt: time,
  lines: [{ sku: "SKU-QA", description: "Polo de prueba", quantity: 1, unitPrice: { amount: 50, currency: "PEN" } }],
  milestones: [{ state: "PAGADO", at: time }],
};

for (const width of [1280, 390]) {
  test("O-008 · reordenado parcial y fallo recuperable, " + width + " px", async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/orders/" + orderId, route => route.fulfill({ json: { data: detail } }));
    const keys: Array<string | undefined> = [];
    await page.route("**/api/orders/" + orderId + "/reorder", route => {
      expect(route.request().method()).toBe("POST");
      keys.push(route.request().headers()["idempotency-key"]);
      return keys.length === 1
        ? route.fulfill({ status: 503, json: { error: { code: "REORDER_UNAVAILABLE" } } })
        : route.fulfill({ json: { data: { cartId: "CART-QA", version: 4,
          added: [{ sku: "SKU-QA", quantity: 1 }], adjustments: [{ sku: "SKU-RETIRADO", reason: "NOT_AVAILABLE" }],
        } } });
    });
    const mutations: string[] = [];
    page.on("request", request => {
      if (request.method() === "POST") mutations.push(new URL(request.url()).pathname);
    });
    await page.goto("/mis-pedidos/" + orderId);
    const trigger = page.getByRole("button", { name: "Agregar productos al carrito" });
    await trigger.click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("La recompra no está disponible");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("o008-error.png"), animations: "disabled" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Resultado parcial del reordenado" });
    await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(dialog.getByText("SKU SKU-QA · Cantidad agregada: 1")).toBeVisible();
    await expect(dialog.getByText("SKU SKU-RETIRADO · Motivo informado: NOT_AVAILABLE")).toBeVisible();
    await expect(dialog.getByText(/No se creó una compra/)).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar" }).focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Ver carrito" })).toBeFocused();
    await page.screenshot({ path: info.outputPath("o008-parcial.png"), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys).toEqual([keys[0], keys[0]]);
    expect(mutations).toEqual(Array(2).fill("/api/orders/" + orderId + "/reorder"));
  });
}

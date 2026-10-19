import { expect, test } from "@playwright/test";

test("checkout local fixtures cover coupon, consent, and clearly labeled paid fixture", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Fixtures locales")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
  await page.getByLabel("Código promocional").fill("SAVE20");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupón aplicado.")).toBeVisible();
  await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
  await expect(page.getByRole("heading", { name: "Pago simulado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar consentimiento" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Registrar consentimiento" }).click();
  await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Ana Prueba");
  await page.getByLabel("Número de documento").fill("12345678");
  await page.getByLabel("Teléfono").fill("999999999");
  await page.getByLabel("Correo electrónico").fill("ana@example.test");
  await page.getByRole("button", { name: "Crear pedido" }).click();
  await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toBeVisible();
  await expect(page.getByText("Resultado de fixture · SUCCEEDED/PAGADO")).toBeVisible();
  await expect(page.getByText("PAGADO (fixture)")).toBeVisible();
});

test("address form validates required fields and saves a local fixture address", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Agregar dirección" }).click();
  await page.getByLabel("Etiqueta").fill("Nueva casa");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Av. Prueba 10");
  await page.getByRole("textbox", { name: "Departamento" }).fill("Lima");
  await page.getByRole("textbox", { name: "Provincia" }).fill("Lima");
  await page.getByRole("textbox", { name: "Distrito" }).fill("Surco");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("977777777");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.getByText("Nueva casa")).toBeVisible();
  await expect(page.getByText("Av. Prueba 10, Surco, Lima")).toBeVisible();
});

test("backend-mock quotes the persisted Cart snapshot and version", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE !== "backend-mock", "requires local Backend and mock auth");
  // Opt-in local integration smoke writes a namespaced E2E-CART-* line to the persistent dev database.
  const sku = `E2E-CART-${Date.now()}`;
  const addResponse = await page.request.post("/api/cart/current/items", {
    data: { sku, quantity: 1 },
  });
  expect(addResponse.ok()).toBeTruthy();

  const cartResponse = await page.request.get("/api/cart/current");
  expect(cartResponse.ok()).toBeTruthy();
  const cart = (await cartResponse.json()).data as {
    cartId: string;
    version: number;
    items: Array<{ sku: string; quantity: number }>;
  };
  expect(cart.items).toEqual(expect.arrayContaining([expect.objectContaining({ sku, quantity: 1 })]));

  page.on("console", (msg) => console.log("BROWSER_LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("BROWSER_ERROR:", err.message));

  await page.goto("/checkout");
  await expect(page.getByText(/Se encontraron \d+ productos para esta compra/)).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Continuar" }).click();
  try {
    await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible({ timeout: 15000 });
  } catch (err) {
    const alerts = await page.locator('[role="alert"], .checkout-error').allTextContents().catch(() => []);
    console.log("CHECKOUT_PAGE_ALERTS:", alerts);
    throw err;
  }
  await expect(page.getByText(`${sku} × 1`)).toBeVisible();
  await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Registrar consentimiento" }).click();
  await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Checkout E2E");
  await page.getByLabel("Número de documento").fill("12345678");
  await page.getByLabel("Teléfono").fill("999999999");
  await page.getByLabel("Correo electrónico").fill("checkout-e2e@example.test");
  await page.getByRole("button", { name: "Crear pedido" }).click();

  if (process.env.MOCK_SALES_OUTCOME === "PAID") {
    await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toBeVisible({ timeout: 15000 });
    const orderLink = page.getByRole("link", { name: "Ver mi pedido" });
    await expect(orderLink).toHaveAttribute("href", /\/checkout\/confirmado\/PED-/);
    await orderLink.click();
    await expect(page.getByRole("heading", { name: "Estado del pedido" })).toBeVisible();
    await expect(page.getByText("Estado verificado · SUCCEEDED/PAGADO")).toBeVisible();
  } else if (process.env.MOCK_SALES_OUTCOME === "REJECTED") {
    await expect(page.getByRole("alert")).toContainText("La operación fue rechazada o anulada. No se mostrará como pedido pagado.");
    await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toHaveCount(0);
  } else {
    await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
    await expect(page.getByText(/resultado final verificado/)).toBeVisible();
    await page.getByRole("button", { name: "Verificar operación original" }).click();
    await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toHaveCount(0);
  }
});

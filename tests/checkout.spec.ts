import { expect, test } from "@playwright/test";

test("checkout local fixtures cover coupon, consent, and clearly labeled paid fixture", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
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
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
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

test("address and quote summary remain usable at mobile and desktop widths", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Dirección de envío" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar al pago simulado" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("backend-mock quotes the persisted Cart snapshot and version", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE !== "backend-mock", "requires local Backend and mock auth");
  // Opt-in integration smoke; run only against the disposable local PostgreSQL database.
  const sku = "SKU-MOCK-001";
  const addResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/cart/current/items") && response.request().method() === "POST",
  );
  await page.goto("/productos/zapatillas-running-aero-x");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  const addResponse = await addResponsePromise;
  expect(addResponse.status()).toBe(201);

  const cart = await page.evaluate(async () => {
    const response = await fetch("/api/cart/current", { cache: "no-store" });
    if (!response.ok) throw new Error(`Cart request failed: ${response.status}`);
    return (await response.json()).data as {
      cartId: string;
      version: number;
      items: Array<{ sku: string; quantity: number }>;
    };
  });
  expect(cart.items).toEqual(expect.arrayContaining([expect.objectContaining({ sku, quantity: 1 })]));

  const quoteResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/checkout/quotes") && response.request().method() === "POST",
  );
  await page.goto("/checkout");
  await expect(page.getByText(/Se encontraron 1 productos para esta compra/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  const quoteResponse = await quoteResponsePromise;
  expect(quoteResponse.ok()).toBeTruthy();
  const quote = (await quoteResponse.json()).data as {
    cartVersion: number;
    lines: Array<{ sku: string; quantity: number }>;
  };
  expect(quote.cartVersion).toBe(cart.version);
  expect(quote.lines).toEqual([{ sku, quantity: 1 }]);
  await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
  await expect(page.getByText(`${sku} × 1`)).toBeVisible();
});

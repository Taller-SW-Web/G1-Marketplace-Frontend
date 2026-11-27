import { expect, test } from "./e2e/csp-guard";
import type { Page, TestInfo } from "@playwright/test";

const checkoutViewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function captureCheckoutState(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const { name, width, height } of checkoutViewports) {
  test(`checkout local fixtures cover coupon, consent, and paid fixture on ${name}`, async ({ page }, testInfo) => {
    test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
    await page.setViewportSize({ width, height });
    await page.goto("/checkout");
    await expect(page.getByText("Fixtures locales")).toBeVisible();
    await page.getByRole("button", { name: "Continuar al resumen" }).click();
    await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
    await page.getByLabel("Código promocional").fill("SAVE20");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Cupón aplicado.")).toBeVisible();
    await captureCheckoutState(page, testInfo, "v011-resumen");
    await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
    await expect(page.getByRole("heading", { name: "Pago simulado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar consentimiento" })).toBeDisabled();
    await captureCheckoutState(page, testInfo, "v012-pago-simulado");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Registrar consentimiento" }).click();
    await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
    await captureCheckoutState(page, testInfo, "v013-creacion-orden");
    await page.getByLabel("Nombre completo").fill("Ana Prueba");
    await page.getByLabel("Número de documento").fill("12345678");
    await page.getByLabel("Teléfono").fill("999999999");
    await page.getByLabel("Correo electrónico").fill("ana@example.test");
    await page.getByRole("button", { name: "Crear pedido" }).click();
    await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toBeVisible();
    await expect(page.getByText("Resultado de fixture · SUCCEEDED/PAGADO")).toBeVisible();
    await expect(page.getByText("PAGADO (fixture)")).toBeVisible();
    await captureCheckoutState(page, testInfo, "v014-confirmado-fixture");
  });

  test(`checkout verification recovers from a provider error on ${name}`, async ({ page }, testInfo) => {
    test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE !== "backend-mock", "requires the backend mock client mode");
    await page.setViewportSize({ width, height });
    const operationId = "00000000-0000-4000-8000-000000000154";
    const orderId = "PED-2026-00154";
    const order = {
      orderId,
      total: { amount: 139.90, currency: "PEN" },
      createdAt: "2026-11-26T15:00:00.000Z",
    };
    const requests: Array<{ stage: number; method: string }> = [];
    let stage = 0;
    const replies = [
      { status: 202, json: { data: { state: "SUBMITTED", order: { ...order, state: "CREADO" } } } },
      { status: 503, json: { error: { code: "SALES_UNAVAILABLE" } } },
      { status: 200, json: { data: { state: "SUCCEEDED", order: { ...order, state: "PAGADO" } } } },
    ];
    await page.route("**/api/checkout/**", async (route) => {
      requests.push({ stage, method: route.request().method() });
      if (route.request().url().endsWith(`/operations/${operationId}`)) {
        await route.fulfill(replies[stage]);
        return;
      }
      await route.abort();
    });

    await page.goto(`/checkout/confirmado/${orderId}?operationId=${operationId}`);
    const paid = page.getByRole("heading", { name: "¡Pedido confirmado!" });
    await expect(page.getByRole("heading", { name: "Estamos verificando tu pedido" })).toBeVisible();
    await expect(paid).toHaveCount(0);
    await captureCheckoutState(page, testInfo, "v014-verificacion-pendiente");

    stage = 1;
    await page.getByRole("button", { name: "Verificar pedido" }).click();
    await expect(page.getByRole("heading", { name: "No pudimos verificar el pedido" })).toBeVisible();
    await expect(paid).toHaveCount(0);
    await captureCheckoutState(page, testInfo, "v014-error-recuperable");

    stage = 2;
    await page.getByRole("button", { name: "Reintentar verificación" }).click();
    await expect(paid).toBeVisible();
    await expect(page.getByText("Estado verificado · SUCCEEDED/PAGADO")).toBeVisible();
    await expect(page.getByText("No pudimos registrar el pedido. Conservamos la operación para verificarla.", { exact: true })).toHaveCount(0);
    expect(requests).toEqual(expect.arrayContaining([
      { stage: 0, method: "GET" }, { stage: 1, method: "GET" }, { stage: 2, method: "GET" },
    ]));
    expect(new Set(requests.map((request) => request.method))).toEqual(new Set(["GET"]));
    await captureCheckoutState(page, testInfo, "v014-confirmado-tras-reintento");
  });
}

test("address form validates required fields and saves a local fixture address", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
  await page.getByLabel("Etiqueta").fill("Nueva casa");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Av. Prueba 10");
  await page.getByRole("textbox", { name: "Departamento" }).fill("Lima");
  await page.getByRole("textbox", { name: "Provincia" }).fill("Lima");
  await page.getByRole("textbox", { name: "Distrito" }).fill("Surco");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("977777777");
  await page.getByRole("button", { name: "Guardar y usar esta dirección" }).click();
  await expect(page.getByRole("radio", { name: /Nueva casa/ })).toBeChecked();
  await expect(page.getByText("Av. Prueba 10, Surco, Lima")).toBeVisible();
});

test("address and quote summary remain usable at mobile and desktop widths", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock", "runs only with local checkout fixtures");
  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "¿Dónde entregamos tu pedido?" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar al resumen" }).click();
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
  await page.getByRole("button", { name: "Continuar al resumen" }).click();
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

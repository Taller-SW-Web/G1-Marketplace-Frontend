import { expect, test } from "@playwright/test";

const orderSummary = {
  orderId: "PED-H4-FIXTURE-001",
  state: "DESPACHADO",
  total: { amount: 249.9, currency: "PEN" },
  createdAt: "2026-10-10T15:00:00.000Z",
};

const orderDetail = {
  ...orderSummary,
  lines: [{
    sku: "SKU-H4-001",
    description: "Producto histórico de prueba",
    quantity: 2,
    unitPrice: { amount: 124.95, currency: "PEN" },
  }],
  milestones: [
    { state: "PAGADO", at: "2026-10-10T15:05:00.000Z" },
    { state: "DESPACHADO", at: "2026-10-11T12:00:00.000Z" },
  ],
  shipping: {
    estimatedDelivery: "2026-10-14",
    locationSummary: "San Isidro, Lima",
    emailMasked: "c•••@•••",
    phoneMasked: "••••••888",
  },
};

test.describe("F-028–F-032 pedidos con fixtures de navegador", () => {
  test("consulta el historial, aplica filtros y abre detalle y seguimiento", async ({ page }) => {
    const listQueries: URL[] = [];
    await page.route("**/api/orders/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/orders/me" && request.method() === "GET") {
        listQueries.push(url);
        await route.fulfill({
          status: 200,
          headers: { "X-Orders-Source": "MOCK", "Cache-Control": "no-store" },
          json: {
            data: [orderSummary],
            page: { number: Number(url.searchParams.get("page") ?? 0), size: 10, totalElements: 1, totalPages: 1 },
          },
        });
        return;
      }
      if (url.pathname === `/api/orders/${orderSummary.orderId}` && request.method() === "GET") {
        await route.fulfill({ status: 200, json: { data: orderDetail } });
        return;
      }
      if (url.pathname === `/api/orders/${orderSummary.orderId}/tracking` && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          json: { data: { state: "DESPACHADO", estimatedDelivery: "2026-10-14T17:00:00.000Z", milestones: orderDetail.milestones } },
        });
        return;
      }
      await route.fulfill({ status: 404, json: { error: { code: "FIXTURE_ROUTE_NOT_FOUND" } } });
    });

    await page.goto("/mis-pedidos");
    await expect(page.getByRole("heading", { name: "Mis pedidos" })).toBeVisible();
    await expect(page.getByText("Datos sintéticos de prueba (MOCK)")).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(orderSummary.orderId) })).toBeVisible();

    await page.getByRole("combobox", { name: "Estado" }).selectOption("DESPACHADO");
    await page.getByRole("textbox", { name: "Desde" }).fill("2026-10-10");
    await page.getByRole("textbox", { name: "Hasta" }).fill("2026-10-10");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page).toHaveURL(/state=DESPACHADO/);
    await expect.poll(() => listQueries.some(url =>
      url.searchParams.get("state") === "DESPACHADO"
      && url.searchParams.get("from") === "2026-10-10"
      && url.searchParams.get("to") === "2026-10-10"
      && url.searchParams.get("page") === "0",
    )).toBe(true);

    await page.getByRole("link", { name: `Ver detalle del pedido ${orderSummary.orderId}` }).click();
    await expect(page).toHaveURL(new RegExp(`/mis-pedidos/${orderSummary.orderId}$`));
    await expect(page.getByRole("heading", { name: "Detalle del pedido" })).toBeVisible();
    await expect(page.getByText("Producto histórico de prueba")).toBeVisible();
    await expect(page.getByText("Total histórico")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Datos de entrega" })).toBeVisible();
    await expect(page.getByText("San Isidro, Lima")).toBeVisible();
    await expect(page.getByText("c•••@•••")).toBeVisible();

    await page.getByRole("link", { name: "Ver seguimiento" }).click();
    await expect(page.getByRole("heading", { name: "Seguimiento del pedido" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "DESPACHADO", exact: true })).toBeVisible();
    await expect(page.getByText(/Entrega estimada/)).toBeVisible();
  });

  test("muestra el estado de sesión vencida si el BFF devuelve 401", async ({ page }) => {
    await page.route("**/api/orders/me?**", route => route.fulfill({
      status: 401,
      headers: { "Cache-Control": "no-store" },
      json: { code: "UNAUTHENTICATED" },
    }));
    await page.goto("/mis-pedidos");
    await expect(page.getByText("Tu sesión venció. Inicia sesión para volver a consultar tus pedidos.")).toBeVisible();
  });

  test("no revela el detalle cuando el pedido no está disponible para la cuenta", async ({ page }) => {
    await page.route("**/api/orders/PED-OTHER-CUSTOMER", route => route.fulfill({
      status: 404,
      headers: { "Cache-Control": "no-store" },
      json: { error: { code: "ORDER_NOT_AVAILABLE" } },
    }));
    await page.goto("/mis-pedidos/PED-OTHER-CUSTOMER");
    await expect(page.getByRole("heading", { name: "Pedido no disponible" })).toBeVisible();
    await expect(page.getByText("No encontramos un pedido disponible para tu cuenta.")).toBeVisible();
    await expect(page.getByText("Producto histórico de prueba", { exact: true })).toHaveCount(0);
  });
});

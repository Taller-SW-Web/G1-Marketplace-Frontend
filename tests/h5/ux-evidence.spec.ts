import { expect, test } from "../e2e/csp-guard";
import type { Page, TestInfo } from "@playwright/test";

const sizes = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const { name, width, height } of sizes) {
  test(`O-006 · última línea y deshacer en ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/demo/h5/qa-carrito");
    await page.getByRole("button", { name: "Quitar Zapatillas de prueba del carrito" }).click();
    await expect(page.getByRole("heading", { name: "Tu carrito está vacío" })).toBeVisible();
    const undo = page.getByRole("button", { name: "Deshacer eliminación de Zapatillas de prueba" });
    await undo.focus();
    await expect(undo).toBeFocused();
    await expect(page.getByRole("link", { name: "Explorar catálogo" })).toBeVisible();
    await capture(page, testInfo, "o006-carrito-vacio-con-deshacer");
    await undo.click();
    await expect(page.getByRole("button", { name: "Quitar Zapatillas de prueba del carrito" })).toBeVisible();
    await expect(undo).toHaveCount(0);
  });

  test(`O-007 · ajustes de fusión y Escape en ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/demo/h5/qa-carrito");
    const trigger = page.getByRole("button", { name: "Simular resultado de fusión tras MFA" });
    const dialog = page.getByRole("dialog", { name: "Ajustes en tu carrito" });
    await expect(dialog).toHaveCount(0);
    await trigger.click();
    await expect(dialog.getByText("Solicitaste 5 · Ajustado a 2")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Entendido" })).toBeFocused();
    await capture(page, testInfo, "o007-ajustes-fusion");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

const orderId = "PED-H5-QA-001";
const recoveryCases = [
  {
    id: "v008-carrito",
    url: "/carrito",
    endpoint: "/api/cart/current",
    loading: "Cargando tu carrito",
    error: "Reintentar carga",
    recovered: "Tu carrito está vacío",
    reply: { status: 200, json: { data: { cartId: null, version: 0, items: [] } } },
  },
  {
    id: "v015-pedidos",
    url: "/mis-pedidos",
    endpoint: "/api/orders/me",
    loading: "Cargando tus pedidos",
    error: "Reintentar",
    recovered: "Aún no has realizado pedidos",
    reply: { status: 200, json: { data: [], page: { number: 0, size: 10, totalElements: 0, totalPages: 0 } } },
  },
  {
    id: "v016-detalle",
    url: `/mis-pedidos/${orderId}`,
    endpoint: `/api/orders/${orderId}`,
    loading: "Cargando detalle del pedido…",
    error: "Reintentar",
    recovered: "Pedido no disponible",
    reply: { status: 404, json: { error: { code: "ORDER_NOT_AVAILABLE" } } },
  },
  {
    id: "v017-seguimiento",
    url: `/mis-pedidos/${orderId}/seguimiento`,
    endpoint: `/api/orders/${orderId}/tracking`,
    loading: "Consultando seguimiento…",
    error: "Reintentar",
    recovered: "El pedido aún no está en despacho",
    reply: { status: 202, json: { data: null } },
  },
];

for (const { name, width, height } of sizes) {
  for (const scenario of recoveryCases) {
    test(`${scenario.id} · carga, fallo y recuperación en ${name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      let releaseFailure!: () => void;
      const holdFailure = new Promise<void>(resolve => { releaseFailure = resolve; });
      let recovery = false;
      await page.route(url => url.pathname === scenario.endpoint, async route => {
        if (recovery) {
          await route.fulfill(scenario.reply);
          return;
        }
        await holdFailure;
        await route.fulfill({ status: 503, json: { error: { code: "PROVIDER_UNAVAILABLE" } } });
      });

      await page.goto(scenario.url);
      const loading = scenario.id === "v008-carrito" || scenario.id === "v015-pedidos"
        ? page.getByLabel(scenario.loading)
        : page.getByText(scenario.loading, { exact: true });
      await expect(loading).toBeVisible();
      await capture(page, testInfo, `${scenario.id}-carga`);
      releaseFailure();
      const retry = page.getByRole("button", { name: scenario.error, exact: true });
      await expect(retry).toBeVisible();
      await capture(page, testInfo, `${scenario.id}-error`);
      recovery = true;
      await retry.click();
      await expect(page.getByRole("heading", { name: scenario.recovered })).toBeVisible();
      await capture(page, testInfo, `${scenario.id}-recuperado`);
    });
  }
}

import { expect, test } from "../e2e/csp-guard";
import type { Page, TestInfo } from "@playwright/test";

const product = { productId: "qa-polo", slug: "polo-qa", name: "Polo de prueba", categoryId: "ropa", brandId: "qa", image: null };
const stamp = "2026-11-26T00:00:00Z";
const categories = [{ categoryId: "ropa", name: "Ropa" }];
const anonymous = { authenticated: false, scope: "anonymous" };
const authenticated = { authenticated: true, scope: "qa-owner", user: { id: "qa-owner" } };

async function capture(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(name + ".png"), fullPage: true, animations: "disabled" });
}

async function catalog(page: Page) {
  await page.route("**/api/catalog/home", route => route.fulfill({ json: { categories, featuredProducts: [] } }));
  await page.route("**/api/catalog/filters", route => route.fulfill({ json: { categories, brands: [] } }));
  await page.route(url => url.pathname === "/api/catalog/products", route => route.fulfill({ json: {
    data: [product], page: { number: 0, size: 24, totalElements: 1, totalPages: 1 },
  } }));
  await page.route("**/api/catalog/products/polo-qa/price", route => route.fulfill({ json: {
    data: { productId: product.productId, sku: "SKU-QA", price: {
      currency: "PEN", regularAmount: 79.90, saleAmount: null, discountPercent: null,
      validFrom: stamp, validUntil: null, priceVersion: 1,
    } },
    meta: { channel: "MARKETPLACE", retrievedAt: stamp },
  } }));
  await page.route("**/api/catalog/products/polo-qa/availability", route => route.fulfill({ json: {
    data: { productId: product.productId, sku: "SKU-QA", availability: "AVAILABLE", checkedAt: stamp },
  } }));
}

for (const width of [1280, 390]) {
  test.describe(width + " px", () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("O-003 · sesión vencida al guardar desde la tarjeta", async ({ page }, info) => {
      await catalog(page);
      let expired = false;
      const posted: unknown[] = [];
      await page.route("**/api/v1/auth/session", route => route.fulfill({ json: expired ? anonymous : authenticated }));
      await page.route("**/api/wishlist/items", route => {
        posted.push(route.request().postDataJSON());
        expired = true;
        return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
      });
      await page.goto("/catalogo?q=polo");
      const card = page.locator(".product-card--listing");
      const favorite = card.getByRole("button", { name: "Guardar en favoritos" });
      await expect(favorite).toBeEnabled();
      await favorite.click();
      await expect(favorite).toBeEnabled();
      await expect(card.getByRole("button", { name: "Quitar de favoritos" })).toHaveCount(0);
      expect(posted).toEqual([{ productId: product.productId }]);
      const dialog = page.getByRole("dialog", { name: "Tu sesión terminó" });
      const login = dialog.getByRole("link", { name: "Iniciar sesión" });
      await expect(login).toHaveAttribute("href", "/login?returnTo=%2Fcatalogo%3Fq%3Dpolo");
      await expect(login).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("button", { name: "Ahora no" })).toBeFocused();
      await capture(page, info, "o003-sesion-vencida");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(favorite).toBeFocused();
      expect(posted).toHaveLength(1);
    });

    test("O-005 y O-010 · conflicto de stock desde la tarjeta", async ({ page }, info) => {
      await catalog(page);
      await page.route("**/api/v1/auth/session", route => route.fulfill({ json: anonymous }));
      const posted: unknown[] = [];
      await page.route("**/api/cart/current/items", route => {
        posted.push(route.request().postDataJSON());
        return route.fulfill({ status: 409, json: { code: "STOCK_LIMIT_REACHED" } });
      });
      await page.goto("/catalogo");
      const card = page.locator(".product-card--listing");
      await card.getByRole("button", { name: "Agregar al carrito" }).click();
      await expect(card.getByRole("alert")).toHaveText("La disponibilidad cambió. Consulta la ficha del producto.");
      await expect(card.getByRole("link", { name: "Ver opciones de Polo de prueba" })).toBeVisible();
      await expect(card.getByText("Producto agregado al carrito")).toHaveCount(0);
      expect(posted).toEqual([{ productId: product.productId, sku: "SKU-QA", quantity: 1 }]);
      await capture(page, info, "o005-stock-rechazado");
    });

    test("O-006 · eliminación rechazada y luego confirmada desde el carrito", async ({ page }, info) => {
      await page.route("**/api/v1/auth/session", route => route.fulfill({ json: anonymous }));
      await page.route("**/api/cart/current", route => route.fulfill({ json: { data: {
        cartId: "CART-QA", version: 1, items: [{ sku: "SKU-QA", name: "Polo de prueba", quantity: 1 }],
      } } }));
      const versions: Array<string | undefined> = [];
      await page.route("**/api/cart/current/items/SKU-QA", route => {
        expect(route.request().method()).toBe("DELETE");
        versions.push(route.request().headers()["if-match"]);
        return versions.length === 1
          ? route.fulfill({ status: 503, json: { code: "COMMERCE_DATA_UNAVAILABLE" } })
          : route.fulfill({ status: 204, headers: { "x-cart-version": "2" } });
      });
      await page.goto("/carrito");
      const main = page.getByRole("main");
      const remove = main.getByRole("button", { name: "Quitar Polo de prueba del carrito" });
      await remove.click();
      await expect(main.getByRole("alert")).toContainText("No pudimos quitar el producto");
      await expect(remove).toBeVisible();
      await expect(main.getByText("Quitaste Polo de prueba del carrito.")).toHaveCount(0);
      await capture(page, info, "o006-eliminacion-rechazada");
      await remove.click();
      await expect(main.getByRole("heading", { name: "Tu carrito está vacío" })).toBeVisible();
      await expect(main.getByRole("status")).toHaveText("Quitaste Polo de prueba del carrito.");
      await expect(main.getByRole("link", { name: "Explorar catálogo" })).toBeVisible();
      await expect(main.getByRole("button", { name: /Deshacer/ })).toHaveCount(0);
      expect(versions).toEqual(["1", "1"]);
      await capture(page, info, "o006-eliminacion-confirmada");
    });

    test("O-009 y O-010 · evaluación conectada tras 503", async ({ page }, info) => {
      await page.route("**/api/v1/auth/session", route => route.fulfill({ json: authenticated }));
      const posted: unknown[] = [];
      await page.route("**/api/h3/csat/PED-H5-QA-002", route => {
        posted.push(route.request().postDataJSON());
        return posted.length === 1
          ? route.fulfill({ status: 503, json: { code: "CSAT_UNAVAILABLE" } })
          : route.fulfill({ status: 201, json: { data: {} } });
      });
      await page.goto("/demo/h4/evaluacion/PED-H5-QA-002");
      await page.getByRole("button", { name: "Evaluar entrega" }).click();
      const dialog = page.getByRole("dialog", { name: "¿Cómo fue tu entrega?" });
      await expect(dialog.getByRole("heading")).toBeFocused();
      await dialog.getByRole("radio", { name: "Regular" }).check();
      await dialog.getByRole("textbox").fill("Comentario sintético de QA");
      const send = dialog.getByRole("button", { name: "Enviar evaluación" });
      await send.click();
      await expect(dialog.getByRole("alert")).toContainText("No pudimos confirmar el envío");
      await expect(dialog.getByRole("textbox")).toHaveValue("Comentario sintético de QA");
      await capture(page, info, "o009-error-con-borrador");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      expect(posted).toHaveLength(1);
      await page.getByRole("button", { name: "Evaluar entrega" }).click();
      await send.click();
      await expect(page.getByRole("heading", { name: "Gracias por compartir tu experiencia" })).toBeVisible();
      expect(posted).toEqual(Array(2).fill({ sentiment: "REGULAR", reasons: [], comment: "Comentario sintético de QA" }));
      await capture(page, info, "o009-confirmacion");
    });

    for (const [code, error] of [
      ["CATALOG_TIMEOUT", "El catálogo tardó demasiado"],
      ["CATALOG_UNAVAILABLE", "El catálogo no está disponible"],
    ]) {
      test("O-010 y V-006 · " + code + " conserva la búsqueda al reintentar", async ({ page }, info) => {
        await catalog(page);
        await page.route("**/api/v1/auth/session", route => route.fulfill({ json: anonymous }));
        const queries: string[] = [];
        await page.route(url => url.pathname === "/api/catalog/products", route => {
          queries.push(new URL(route.request().url()).searchParams.get("q") ?? "");
          return queries.length === 1
            ? route.fulfill({ status: 503, json: { code } })
            : route.fulfill({ json: { data: [], page: { number: 0, size: 24, totalElements: 0, totalPages: 0 } } });
        });
        await page.goto("/catalogo?q=polo");
        const main = page.getByRole("main");
        await expect(main.getByRole("heading", { name: error })).toBeVisible();
        await expect(main.getByRole("alert")).toBeVisible();
        await expect(main.getByRole("heading", { name: "Sin resultados" })).toHaveCount(0);
        await capture(page, info, "v006-" + code.toLowerCase());
        await main.getByRole("button", { name: "Reintentar" }).click();
        await expect(main.getByRole("heading", { name: "Sin resultados" })).toBeVisible();
        await expect(main.getByRole("heading", { level: 1 })).toBeFocused();
        expect(queries).toEqual(["polo", "polo"]);
      });
    }
  });
}

for (const width of [1280, 390]) {
  test.describe("Estados " + width + " px", () => {
    test.use({ viewport: { width, height: 900 } });
    for (const scenario of [
      { id: "v009-favoritos", path: "/favoritos", api: "/api/wishlist",
        retry: "Reintentar", empty: "Aún no tienes favoritos", json: [] },
      { id: "v010-direccion", path: "/checkout/direccion", api: "/api/checkout/delivery-addresses",
        retry: "Reintentar carga de direcciones",
        empty: "Aún no tienes direcciones guardadas. Registra una para continuar con tu compra.",
        json: { data: [] } },
    ]) {
      test(scenario.id + " · fallo y recuperación", async ({ page }, info) => {
        await page.route("**/api/v1/auth/session", route => route.fulfill({ json: authenticated }));
        await page.route("**/api/cart/current", route => route.fulfill({ json: { data: {
          cartId: "CART-QA", version: 1, items: [{ sku: "SKU-QA", quantity: 1 }],
        } } }));
        let failed = true;
        await page.route(url => url.pathname === scenario.api, route => failed
          ? route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE", error: { code: "ADDRESS_UNAVAILABLE" } } })
          : route.fulfill({ json: scenario.json }));
        await page.goto(scenario.path);
        const retry = page.getByRole("button", { name: scenario.retry, exact: true });
        await expect(retry).toBeVisible();
        await expect(page.getByText(scenario.empty, { exact: true })).toHaveCount(0);
        await capture(page, info, scenario.id + "-error");
        failed = false;
        await retry.click();
        await expect(page.getByText(scenario.empty, { exact: true })).toBeVisible();
        await capture(page, info, scenario.id + "-recuperado");
      });
    }
  });
}

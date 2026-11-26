import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * V-007 · ficha de producto rediseñada (FE #146).
 *
 * Cubre los criterios del issue sobre el BFF MOCK real:
 * - panel de compra fijo en escritorio y adaptado en móvil,
 * - galería con visor y zoom operable por teclado,
 * - cambio de SKU/imagen de variante,
 * - relacionados y degradación de precio/stock.
 *
 * Las capturas de `docs/evidencias/H5/V-007-ficha/` se generan con este mismo
 * commit; son evidencia del corte, no decoración.
 */

const EVIDENCE_DIR = join("docs", "evidencias", "H5", "V-007-ficha");
const FICHA = "/productos/producto-demostracion-4";
const VARIABLE = "/productos/producto-variable-mock";

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test.describe("V-007 · ficha y panel de compra", () => {
  test("renderiza galería, panel comercial, especificaciones y relacionados", async ({
    page,
  }, testInfo) => {
    await page.goto(FICHA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Short de running 04",
    );
    await expect(page.locator(".detail-layout")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Productos relacionados" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".related-card").first()).toBeVisible();
    await expect(page.locator(".price-current")).toContainText("S/");
    await expect(page.locator(".availability-status")).toBeVisible();

    await page.screenshot({
      path: join(EVIDENCE_DIR, `${testInfo.project.name}-ficha.png`),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("mantiene el panel de compra visible al desplazar en escritorio", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Sólo aplica a escritorio.");
    await page.goto(FICHA);
    const summary = page.locator(".detail-summary");
    await expect(summary).toBeVisible();
    await expect
      .poll(() => summary.evaluate((el) => getComputedStyle(el).position))
      .toBe("sticky");

    await page.mouse.wheel(0, 700);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await page.screenshot({
      path: join(EVIDENCE_DIR, "desktop-panel-fijo.png"),
      animations: "disabled",
    });
  });

  test("adapta el panel comercial al ancho móvil sin desbordar", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Sólo aplica a móvil.");
    await page.goto(FICHA);
    const summary = page.locator(".detail-summary");
    await expect(summary).toBeVisible();
    await expect
      .poll(() => summary.evaluate((el) => getComputedStyle(el).position))
      .not.toBe("sticky");

    const cta = page.getByRole("button", { name: "Agregar al carrito" });
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(280);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    );
  });
});

test.describe("V-007 · visor y zoom por teclado", () => {
  test("abre el visor, cambia el zoom con teclado y devuelve el foco", async ({
    page,
  }, testInfo) => {
    await page.goto(FICHA);
    const zoomTrigger = page.getByRole("button", { name: "Ampliar imagen" });
    await zoomTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar visor" })).toBeFocused();
    await expect(page.getByText("100 % de zoom")).toBeVisible();

    await page.keyboard.press("=");
    await expect(page.getByText("150 % de zoom")).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: join(EVIDENCE_DIR, "desktop-viewer-zoom.png"),
        animations: "disabled",
      });
    }

    await page.keyboard.press("0");
    await expect(page.getByText("100 % de zoom")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".viewer-position")).toHaveText(/Imagen 2 de \d+/u);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(zoomTrigger).toBeFocused();
  });
});

test.describe("V-007 · SKU, imagen y relacionados", () => {
  test("la variante elegida cambia SKU, imagen, precio y habilita el CTA", async ({
    page,
  }) => {
    await page.goto(VARIABLE);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("[MOCK]");
    await expect(page.locator(".price-hint")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeDisabled();

    const color = page.getByRole("group", { name: "Color" });
    const size = page.getByRole("group", { name: "Talla" });
    await color.getByRole("button", { name: "Negro" }).click();
    await size.getByRole("button", { name: "42" }).click();

    await expect(page.locator(".gallery-main img")).toHaveAttribute(
      "src",
      /AERO-NEGRO-42/u,
    );
    await expect(page.locator(".price-current")).toContainText("S/");
    await expect(page.locator(".price-offer")).toContainText("Oferta");
    await expect(page.locator(".availability-status")).toContainText("Disponible");
    await expect(page.locator(".selection-summary")).toContainText(
      "Selección: Color: Negro · Talla: 42.",
    );
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeEnabled();

    await page.getByRole("button", { name: "Ampliar imagen" }).click();
    await expect(page.getByRole("dialog").locator("img")).toHaveAttribute(
      "src",
      /AERO-NEGRO-42/u,
    );
    await page.getByRole("button", { name: "Cerrar visor" }).click();
  });

  test("degrada precio y stock sin bloquear la lectura de la ficha", async ({
    page,
  }, testInfo) => {
    await page.route("**/api/catalog/products/producto-demostracion-4/price", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        headers: { "X-Catalog-Source": "REAL" },
        body: JSON.stringify({
          type: "https://marketplace.example.com/problems/pricing-unavailable",
          title: "Precio no disponible",
          status: 503,
          code: "PRICING_UNAVAILABLE",
          instance: "/api/v1/catalog/products/producto-demostracion-4/price",
          requestId: "fe146-price-503",
        }),
      }),
    );
    await page.route(
      "**/api/catalog/products/producto-demostracion-4/availability",
      (route) =>
        route.fulfill({
          status: 502,
          contentType: "application/problem+json",
          headers: { "X-Catalog-Source": "REAL" },
          body: JSON.stringify({
            type: "https://marketplace.example.com/problems/inventory-invalid-response",
            title: "Respuesta de inventario inválida",
            status: 502,
            code: "INVENTORY_INVALID_RESPONSE",
            instance:
              "/api/v1/catalog/products/producto-demostracion-4/availability",
            requestId: "fe146-stock-502",
          }),
        }),
    );

    await page.goto(FICHA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Short de running 04",
    );
    await expect(page.getByText("Precio por confirmar.")).toBeVisible();
    await expect(
      page.getByText("No pudimos consultar disponibilidad."),
    ).toBeVisible();
    // Con fuente REAL el CTA no se publica (gate I-01/F-016): la ficha degrada
    // sin ofrecer una compra que no puede respaldar precio ni stock.
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Productos relacionados" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: join(EVIDENCE_DIR, `${testInfo.project.name}-degradacion-precio-stock.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
});

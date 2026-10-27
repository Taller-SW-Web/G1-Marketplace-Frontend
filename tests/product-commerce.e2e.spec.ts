import { test, expect } from "@playwright/test";

/**
 * F-012…F-015 · Frontend → proxy → BFF MOCK.
 *
 * Estas pruebas ejercitan el camino real (`next start` + BFF NestJS en modo
 * MOCK), por lo que requieren el backend con los endpoints comerciales. Cubren
 * los estados que no se pueden demostrar sólo con componentes: selección de
 * variante con cambio de SKU, los tres estados de disponibilidad, oferta
 * vigente/ausente y la región de relacionados.
 */

test.describe("ficha comercial MOCK · F-012…F-015", () => {
  test("F-013/F-012/F-014: la selección resuelve SKU, precio, stock y CTA", async ({
    page,
  }) => {
    await page.goto("/productos/producto-variable-mock");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("[MOCK]");

    // Sin SKU no hay precio ni disponibilidad heredados.
    await expect(page.locator(".price-hint")).toHaveText(
      "Selecciona una opción para ver el precio.",
    );
    await expect(page.locator(".availability-hint")).toHaveText(
      "Selecciona una opción para consultar disponibilidad.",
    );
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeDisabled();

    const color = page.getByRole("group", { name: "Color" });
    const size = page.getByRole("group", { name: "Talla" });

    await color.getByRole("button", { name: "Negro" }).click();
    await size.getByRole("button", { name: "42" }).click();

    await expect(page.locator(".price-current")).toContainText("S/");
    await expect(page.locator(".price-offer")).toContainText("Oferta");
    await expect(page.locator(".price-discount")).toContainText("−14");
    await expect(page.locator(".availability-status")).toContainText(
      "Disponible",
    );
    await expect(page.locator(".selection-summary")).toContainText(
      "Selección: Color: Negro · Talla: 42.",
    );

    const cta = page.getByRole("button", { name: "Agregar al carrito" });
    await expect(cta).toBeEnabled();

    // Blanco + 42 no tiene precio vigente y está agotado: no se hereda nada.
    await color.getByRole("button", { name: "Blanco" }).click();
    await expect(page.locator(".price-badge")).toHaveCount(0);
    await expect(page.locator(".price-current")).toHaveCount(0);
    await expect(page.locator(".price-unavailable")).toContainText(
      "Precio no disponible por el momento.",
    );
    await expect(page.locator(".availability-status")).toContainText("Agotado");
    await expect(cta).toBeDisabled();

    // La combinación blanco + 43 no existe: queda deshabilitada.
    await expect(size.getByRole("button", { name: "43" })).toBeDisabled();
  });

  test("F-012: sin oferta no se inventa descuento y demo 4 sí la publica", async ({
    page,
  }) => {
    await page.goto("/productos/producto-demostracion-2");
    await expect(page.locator(".price-current")).toContainText("S/");
    await expect(page.locator(".price-badge")).toHaveCount(0);
    await expect(page.locator(".price-reference")).toHaveCount(0);

    await page.goto("/productos/producto-demostracion-4");
    await expect(page.locator(".price-badge")).toContainText("Oferta");
    await expect(page.locator(".price-discount")).toContainText("−15");
    await expect(page.locator(".price-reference s")).toContainText("S/");
    await expect(page.locator(".price-validity")).toContainText(
      "Oferta válida hasta",
    );
  });

  test("F-014: los tres estados comerciales no exponen cantidades", async ({
    page,
  }) => {
    await page.goto("/productos/producto-demostracion-3");
    await expect(page.locator(".availability-status")).toContainText(
      "Quedan pocas unidades",
    );
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeEnabled();

    await page.goto("/productos/producto-demostracion-5");
    await expect(page.locator(".availability-status")).toContainText("Agotado");
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeDisabled();

    const body = page.locator(".product-commerce");
    await expect(body).not.toContainText(/unidades disponibles/i);
    await expect(body).not.toContainText(/almac[eé]n/i);
  });

  test("F-015: tarjetas completas con enlace a la ficha", async ({ page }) => {
    await page.goto("/productos/producto-demostracion-1");
    await expect(
      page.getByRole("heading", { name: "Productos relacionados" }),
    ).toBeVisible();

    const cards = page.locator(".related-products .related-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toHaveAttribute(
      "href",
      "/productos/producto-demostracion-2",
    );
    await expect(page.locator(".related-card .related-name").first()).toContainText(
      "Polo de entrenamiento",
    );
  });
});

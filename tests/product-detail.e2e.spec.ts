import { test, expect } from "@playwright/test";

/**
 * F-011 · Frontend → BFF MOCK (reproducible con `npm run test:e2e`):
 * Playwright levanta el BFF NestJS (BFF_MODE=mock) y Next (`next start`),
 * así que estas pruebas ejercitan el camino real proxy → BFF → fixture.
 *
 * Cubre: aviso [MOCK], errores acordados (404/503/504), HTTP 404 real y el
 * handoff tarjeta → ficha del producto correspondiente.
 */

/** Listado interceptado (mientras /products viva en el PR #11 F-006/F-007). */
const CATALOG_PAGE = {
  data: [
    {
      productId: "mock-product-5",
      slug: "producto-demostracion-5",
      name: "Zapatillas de running 05",
      categoryId: "running",
      brandId: "mock-brand",
      image: { url: "/fixtures/product-0.svg", alt: "Zapatillas de running" },
    },
    {
      productId: "mock-product-2",
      slug: "producto-demostracion-2",
      name: "Polo de entrenamiento 02",
      categoryId: "training",
      brandId: "mock-brand",
      image: { url: "/fixtures/product-1.svg", alt: "Polo de entrenamiento" },
    },
  ],
  page: { number: 0, size: 24, totalElements: 2, totalPages: 1 },
};

test.describe("F-011 · Frontend → BFF MOCK", () => {
  test("la tarjeta abre la ficha del producto correspondiente y conserva returnTo", async ({
    page,
  }) => {
    await page.route("**/api/catalog/products*", (route) =>
      route.fulfill({ json: CATALOG_PAGE, headers: { "X-Catalog-Source": "MOCK" } }),
    );
    await page.goto("/catalogo?categoryIds=running");

    const firstCard = page.locator(".product-card a").first();
    await expect(firstCard).toHaveAttribute("href", /\/productos\/producto-demostracion-5\?returnTo=/);

    await firstCard.click();
    await expect(page).toHaveURL(/\/productos\/producto-demostracion-5\?returnTo=/);

    // La ficha corresponde al producto clickeado (fixture espejo del listado).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /zapatillas de running 05/i,
    );
    await expect(page.getByRole("note")).toContainText("[MOCK]");

    // El criterio de origen viaja en el handoff y sobrevive en la migra.
    await expect(
      page.getByRole("link", { name: "Catálogo", exact: true }),
    ).toHaveAttribute("href", /\/catalogo\?categoryIds=running/);
  });

  test("Ficha MOCK muestra la región comercial F-012…F-015", async ({
    page,
  }) => {
    await page.goto("/productos/zapatillas-running-aero-x");
    await expect(page.getByRole("note")).toContainText(
      "Ficha de demostración · Datos de prueba [MOCK]",
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText("[MOCK]");
    await expect(page.getByText("Malla técnica")).toBeVisible();

    // F-012: precio vigente y oferta derivada por el BFF.
    await expect(page.locator(".price-current")).toContainText("S/");
    await expect(page.locator(".price-offer")).toContainText("Oferta");
    // F-014: estado comercial, sin cantidades.
    await expect(page.locator(".availability-status")).toContainText(
      "Disponible",
    );
    // F-015: recomendaciones del BFF con enlaces a la ficha.
    await expect(page.locator(".related-products h2")).toHaveText(
      "Productos relacionados",
    );
    await expect(page.locator(".related-card")).toHaveCount(4);

    // F-016: el CTA se habilita sólo cuando precio y disponibilidad están listos.
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeEnabled();
  });

  test("producto inexistente responde HTTP 404 con estado neutral", async ({
    page,
  }) => {
    const response = await page.goto("/productos/producto-demostracion-99");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /producto no disponible/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al catálogo" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  test("slug especial 404 también responde HTTP 404", async ({ page }) => {
    const response = await page.goto("/productos/producto-no-existente-mock");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /producto no disponible/i }),
    ).toBeVisible();
  });

  test("503 acordado → estado de error recuperable", async ({ page }) => {
    await page.goto("/productos/producto-error-503-mock");
    await expect(
      page.getByRole("heading", { level: 1, name: "No pudimos cargar este producto" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.locator("[data-error-code]")).toHaveAttribute(
      "data-error-code",
      "PRODUCT_CATALOG_UNAVAILABLE",
    );
  });

  test("504 acordado → estado de error recuperable", async ({ page }) => {
    await page.goto("/productos/producto-error-504-mock");
    await expect(
      page.getByRole("heading", { level: 1, name: "No pudimos cargar este producto" }),
    ).toBeVisible();
    await expect(page.locator("[data-error-code]")).toHaveAttribute(
      "data-error-code",
      "PRODUCT_CATALOG_TIMEOUT",
    );
  });
});

import { expect, test } from "@playwright/test";

test("home and catalog retain products without images and load a local placeholder", async ({ page, request }) => {
  const product = {
    productId: "without-image", slug: "producto-sin-imagen", name: "Producto sin imagen",
    categoryId: "running", brandId: "brand", image: null,
  };
  await page.route("**/api/catalog/home", (route) => route.fulfill({
    json: { categories: [], featuredProducts: [product] },
    headers: { "X-Catalog-Source": "MOCK" },
  }));
  await page.route("**/api/catalog/products*", (route) => route.fulfill({
    json: {
      data: [product, { ...product, productId: "with-image", slug: "producto-con-imagen", name: "Producto con imagen", image: { url: "/fixtures/product-0.svg", alt: "Imagen del producto" } }],
      page: { number: 0, size: 24, totalElements: 2, totalPages: 1 },
    },
    headers: { "X-Catalog-Source": "MOCK" },
  }));
  const asset = await request.get("/images/product-placeholder.svg");
  expect(asset.ok()).toBe(true);
  expect(asset.headers()["content-type"]).toContain("image/svg+xml");
  for (const path of ["/", "/catalogo"]) {
    await page.goto(path);
    const placeholder = page.getByRole("img", { name: "Imagen no disponible para Producto sin imagen" });
    await expect(placeholder).toHaveAttribute("src", "/images/product-placeholder.svg");
    await placeholder.scrollIntoViewIfNeeded();
    await expect.poll(() => placeholder.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
  }
  await expect(page.locator(".product-card")).toHaveCount(2);
  await expect(page.getByRole("status")).toHaveText("2 productos");
  await expect(page.getByRole("img", { name: "Imagen del producto" })).toHaveAttribute("src", "/fixtures/product-0.svg");
  await expect(page.locator(".product-card").first().getByRole("link"))
    .toHaveAttribute("href", "/productos/producto-sin-imagen?returnTo=%2Fcatalogo");
  await page.screenshot({ path: "test-results/catalogo-imagen-opcional.png", fullPage: true });
});

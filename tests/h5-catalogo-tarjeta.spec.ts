import { join } from "node:path";
import { expect, test } from "@playwright/test";

const origin = "https://slzglmtiyrzygpkiuthf.supabase.co";
const fixtures = [
  { slug: "botella-trail", name: "Botella Trail", asset: "favorite-bottle.png" },
  { slug: "chaleco-de-running", name: "Chaleco de running", asset: "favorite-vest.png" },
  { slug: "adidas-terrex", name: "Adidas Terrex", asset: "favorite-terrex.png" },
  { slug: "nike-air-max", name: "Nike Air Max", asset: "hero-shoe.png" },
];
const categories = [{ categoryId: "trail", name: "Trail" }];
const products = fixtures.map(({ slug, name, asset }) => ({
  slug, name, productId: `qa-${slug}`, categoryId: "trail", brandId: "qa",
  image: { alt: name, url: `${origin}/h5-qa/${asset}` },
}));
const timestamp = "2026-11-24T12:00:00Z";

for (const width of [1366, 390]) {
  test(`Tarjeta V-006 en ${width} px valida precio, disponibilidad y carrito`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/catalog/home", route => route.fulfill({ json: { categories, featuredProducts: [] } }));
    await page.route("**/api/catalog/filters", route => route.fulfill({ json: { categories, brands: [] } }));
    await page.route("**/api/catalog/products?**", route => route.fulfill({
      headers: { "X-Catalog-Source": "MOCK" },
      json: { data: products, page: { number: 0, size: 24, totalElements: 4, totalPages: 1 } },
    }));
    await page.route(`${origin}/h5-qa/*`, route => {
      const item = fixtures.find(({ asset }) => route.request().url().endsWith("/" + asset));
      return item ? route.fulfill({ path: join("public/figma", item.asset), contentType: "image/png" }) : route.abort();
    });
    await page.route("**/api/catalog/products/*/price", route => {
      const slug = new URL(route.request().url()).pathname.split("/").at(-2);
      if (slug === "chaleco-de-running") {
        return route.fulfill({ status: 409, json: { code: "PRODUCT_VARIANT_SELECTION_REQUIRED" } });
      }
      return route.fulfill({ json: {
        data: { productId: `qa-${slug}`, sku: `SKU-${slug}`, price: {
          currency: "PEN", regularAmount: 99.90, saleAmount: 79.90, discountPercent: 20,
          validFrom: "2025-01-01T00:00:00Z", validUntil: slug === "nike-air-max" ? "2026-01-01T00:00:00Z" : null, priceVersion: 1,
        } },
        meta: { channel: "MARKETPLACE", retrievedAt: timestamp },
      } });
    });
    await page.route("**/api/catalog/products/*/availability", route => {
      const slug = new URL(route.request().url()).pathname.split("/").at(-2);
      if (slug === "nike-air-max") {
        return route.fulfill({ status: 503, json: { code: "INVENTORY_UNAVAILABLE" } });
      }
      return route.fulfill({ json: { data: {
        productId: `qa-${slug}`,
        sku: slug === "adidas-terrex" ? "OTHER-SKU" : `SKU-${slug}`,
        availability: "AVAILABLE",
        checkedAt: timestamp,
      } } });
    });
    await page.route("**/api/v1/auth/session", route => route.fulfill({ json: { authenticated: false, scope: "anonymous" } }));
    const adds: unknown[] = [];
    await page.route("**/api/cart/current/items", route => {
      adds.push(route.request().postDataJSON());
      if (adds.length > 1) return route.fulfill({ status: 404, json: { code: "SKU_NOT_AVAILABLE" } });
      return route.fulfill({ status: 201, json: { data: { cartId: "QA", version: 1, items: [] } } });
    });

    await page.goto("/catalogo?pageSize=24");
    const cards = page.locator(".product-card--listing");
    await expect(cards).toHaveCount(4);
    const bottle = cards.filter({ has: page.getByRole("heading", { name: "Botella Trail" }) });
    const add = bottle.getByRole("button", { name: "Agregar al carrito" });
    await expect(add).toBeVisible();
    await expect(bottle.locator("s")).toContainText(/99[.,]90/);
    await expect(bottle).toContainText(/79[.,]90/);
    await expect(bottle.getByRole("button", { name: "Guardar en favoritos" })).toBeEnabled();
    expect(adds).toEqual([]);

    for (const name of ["Chaleco de running", "Adidas Terrex", "Nike Air Max"]) {
      const card = cards.filter({ has: page.getByRole("heading", { name }) });
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByRole("link", { name: `Ver opciones de ${name}` })).toBeVisible();
      await expect(card.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
    }
    await expect(cards.nth(1)).toContainText("Precio por confirmar");
    await expect(cards.nth(3)).toContainText(/99[.,]90/);
    await expect(cards.nth(3).locator("s")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (process.env.H5_CATALOGO_CAPTURAS) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: join(process.env.H5_CATALOGO_CAPTURAS, `tarjeta-${width}.png`), fullPage: true });
    }
    await add.click();
    await expect(bottle.getByRole("status")).toContainText("Producto agregado al carrito");
    expect(adds).toEqual([{ productId: "qa-botella-trail", sku: "SKU-botella-trail", quantity: 1 }]);
    await page.keyboard.press("Escape");
    await add.click();
    await expect(bottle.getByRole("alert")).toContainText("La disponibilidad cambió");
    await expect(bottle.getByRole("link", { name: "Ver opciones de Botella Trail" })).toBeVisible();
    await expect(add).toHaveCount(0);
  });
}

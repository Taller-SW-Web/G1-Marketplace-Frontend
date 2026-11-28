import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const mediaHost = "https://slzglmtiyrzygpkiuthf.supabase.co";
const categories = [
  { categoryId: "calzado", name: "Calzado" },
  { categoryId: "ropa", name: "Ropa" },
  { categoryId: "equipamiento", name: "Equipamiento" },
];
const products = [
  { slug: "nike-air-max", name: "Nike Air Max", categoryId: "calzado", asset: "hero-shoe.png", amount: 349.90 },
  { slug: "chaleco-running", name: "Chaleco de running", categoryId: "ropa", asset: "favorite-vest.png", amount: 129.90 },
  { slug: "botella-deportiva", name: "Botella deportiva", categoryId: "equipamiento", asset: "favorite-bottle.png", amount: 39.90 },
  { slug: "adidas-terrex", name: "Adidas Terrex", categoryId: "calzado", asset: "favorite-terrex.png", amount: 289.90 },
  { slug: "ropa-entrenamiento", name: "Ropa de entrenamiento", categoryId: "ropa", asset: "favorite-vest.png", amount: 89.90 },
];
const featuredProducts = products.map(({ slug, name, categoryId, asset }) => ({
  productId: "qa-" + slug,
  slug,
  name,
  categoryId,
  brandId: "qa",
  image: { alt: name, url: mediaHost + "/h5-qa/" + asset },
}));
const home = { categories, featuredProducts };
const mockSource = { "X-Catalog-Source": "MOCK" };

async function capture(page: Page, state: string) {
  const output = process.env.H5_INICIO_CAPTURAS;
  if (!output) return;
  const device = (page.viewportSize()?.width ?? 1366) < 768 ? "movil" : "escritorio";
  await page.screenshot({ path: join(output, `${device}-${state}.png`), fullPage: true, animations: "disabled" });
}

for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`Inicio ${viewport.width} px`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("muestra categorías, precios verificados y destacados en orden con navegación manual", async ({ page }) => {
      await page.route("**/api/catalog/home", route => route.fulfill({ headers: mockSource, json: home }));
      await page.route(mediaHost + "/h5-qa/*", route => {
        const asset = products.find(product => route.request().url().endsWith("/" + product.asset))?.asset;
        return asset ? route.fulfill({ path: join("public/figma", asset), contentType: "image/png" }) : route.abort();
      });
      await page.route("**/api/catalog/products/*/price", route => {
        const product = products.find(product => route.request().url().endsWith(`/${product.slug}/price`));
        if (!product || product.slug === "ropa-entrenamiento") {
          return route.fulfill({ status: 503, json: { code: "PRICING_UNAVAILABLE" } });
        }
        const sale = product.slug === "nike-air-max";
        return route.fulfill({ json: {
          data: {
            productId: "qa-" + product.slug,
            sku: "QA-" + product.slug,
            price: {
              currency: "PEN", regularAmount: sale ? 399.90 : product.amount, saleAmount: sale ? product.amount : null,
              discountPercent: sale ? 13 : null, validFrom: "2025-01-01T00:00:00Z", validUntil: null, priceVersion: 1,
            },
          },
          meta: { channel: "MARKETPLACE", retrievedAt: "2026-11-24T12:00:00Z" },
        } });
      });
      await page.goto("/");
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1 })).toContainText(/Equípate para\s*moverte/i);
      await expect(main.getByRole("link", { name: "Explorar catálogo" })).toHaveAttribute("href", "/catalogo");
      await expect(main.getByRole("link", { name: "Equipamiento" })).toHaveAttribute("href", "/catalogo?categoryIds=equipamiento");
      await expect(main.getByRole("note")).toContainText("demostración");
      const rail = main.getByRole("group", { name: "Carrusel de destacados" });
      await expect(rail.getByRole("heading")).toHaveText(products.map(product => product.name));
      await expect(rail.getByRole("article").first()).toContainText(/349[.,]90/);
      await expect(rail.getByRole("article").first().locator("s")).toContainText(/399[.,]90/);
      await expect(rail.getByRole("article").last()).toContainText("Precio por confirmar");
      await expect(rail.getByRole("link", { name: "Ver opciones de Nike Air Max" })).toHaveAttribute("href", "/productos/nike-air-max?returnTo=%2F");
      await expect.poll(() => main.getByAltText("Zapatilla deportiva negra y blanca").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expect.poll(() => main.getByAltText("Nike Air Max").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      const next = main.getByRole("button", { name: "Siguientes destacados" });
      const previous = main.getByRole("button", { name: "Destacados anteriores" });
      await expect(next).toBeEnabled();
      await expect(previous).toBeDisabled();
      const target = await next.boundingBox();
      expect(target?.width).toBeGreaterThanOrEqual(44);
      expect(target?.height).toBeGreaterThanOrEqual(44);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBe(viewport.width);
      await capture(page, "listo");
      await rail.press("ArrowRight");
      await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      await previous.click();
      await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBe(0);
    });

    test("distingue la carga del vacío y conserva la salida al catálogo", async ({ page }) => {
      let resolveHome!: () => void;
      const pendingHome = new Promise<void>(resolve => { resolveHome = resolve; });
      await page.route("**/api/catalog/home", async route => {
        await pendingHome;
        await route.fulfill({ headers: mockSource, json: { categories: [], featuredProducts: [] } });
      });
      await page.goto("/");
      try {
        await expect(page.getByRole("status", { name: "Cargando categorías" })).toBeVisible();
        await expect(page.getByRole("status", { name: "Cargando productos" })).toBeVisible();
        await capture(page, "carga");
      } finally {
        resolveHome();
      }
      await expect(page.getByRole("heading", { name: "Encuentra tu próximo favorito" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Compra por categoría" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Destacados" })).toHaveCount(0);
      await expect(page.getByRole("main").getByRole("link", { name: "Explorar catálogo" })).toHaveAttribute("href", "/catalogo");
      await capture(page, "vacio");
    });

    test("permite reintentar el error y oculta destacados cuando solo hay categorías", async ({ page }) => {
      let failed = true;
      await page.route("**/api/catalog/home", route => failed
        ? route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } })
        : route.fulfill({ headers: mockSource, json: { categories, featuredProducts: [] } }));
      await page.goto("/");
      const main = page.getByRole("main");
      await expect(main.getByRole("alert")).toContainText("No pudimos cargar");
      await expect(main.getByRole("link", { name: "Volver al catálogo" })).toHaveAttribute("href", "/catalogo");
      await capture(page, "error");
      failed = false;
      await main.getByRole("button", { name: "Reintentar" }).click();
      await expect(main.getByRole("heading", { name: "Compra por categoría" })).toBeVisible();
      await expect(main.getByRole("heading", { name: "Destacados" })).toHaveCount(0);
    });
  });
}

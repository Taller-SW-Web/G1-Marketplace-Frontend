import { test, expect, type Page } from "@playwright/test";

const categories = [
  { categoryId: "calzado", name: "Calzado" },
  { categoryId: "ropa", name: "Ropa" },
  { categoryId: "equipamiento", name: "Equipamiento" },
];
const brands = [{ brandId: "nike", name: "Nike" }];
const product = {
  productId: "qa-air-max", name: "Nike Air Max", slug: "nike-air-max",
  brandId: "nike", categoryId: "calzado", image: null,
};

async function mockCatalog(page: Page, { suggestionsDown = false } = {}) {
  await page.route("**/api/catalog/home", route => route.fulfill({ json: { categories, featuredProducts: [] } }));
  await page.route("**/api/catalog/filters", route => suggestionsDown
    ? route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } })
    : route.fulfill({ json: { categories, brands } }));
  await page.route("**/api/catalog/products?**", route => {
    const params = new URL(route.request().url()).searchParams;
    const size = Number(params.get("pageSize") ?? 24);
    const number = Number(params.get("page") ?? 0);
    if (suggestionsDown && size === 3) return route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } });
    return route.fulfill({ json: {
      sort: params.get("sort"), data: number === 0 ? [product] : [],
      page: { number, size, totalElements: 1, totalPages: 1 },
    } });
  });
}

test("desktop header keeps only the essentials: no category row under the logo", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockCatalog(page);
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Inka Athletics, inicio" })).toBeVisible();
  await expect(header.getByRole("searchbox", { name: "Buscar productos" })).toBeVisible();
  // Las categorías viven dentro de la cabecera del catálogo y en el menú móvil, no bajo el logo.
  await expect(header.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
});

test("header hides while scrolling down through products and returns when scrolling up", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockCatalog(page);
  await page.goto("/catalogo");
  await page.evaluate(() => { document.body.style.minHeight = "4000px"; });
  const header = page.getByRole("banner");
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(header).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(header).toHaveAttribute("data-hidden", "false");
});

test("suggestions use real catalog links and Escape leaves normal submit available", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockCatalog(page);
  await page.goto("/catalogo?categoryIds=calzado&sort=NAME_DESC&page=1");
  const search = page.getByRole("searchbox", { name: "Buscar productos" });
  await search.fill("nike");
  const list = page.getByRole("list", { name: "Sugerencias de búsqueda" });
  await expect(list.getByRole("link", { name: "Nike Air Max" })).toHaveAttribute("href", "/productos/nike-air-max");
  await expect(list.getByRole("link", { name: "Marca Nike" })).toHaveAttribute("href", "/catalogo?brandIds=nike");
  await expect(list.getByRole("link", { name: "Calzado" })).toHaveAttribute("href", "/catalogo?categoryIds=calzado");
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("link", { name: "Nike Air Max" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  await expect(list).toHaveCount(0);
  await search.press("Enter");
  await expect(page).toHaveURL(url => url.searchParams.get("q") === "nike" &&
    url.searchParams.get("categoryIds") === "calzado" && url.searchParams.get("sort") === "NAME_DESC" &&
    !url.searchParams.has("page"));
});

test("mobile drawer is modal and accessible while suggestions are down", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCatalog(page, { suggestionsDown: true });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Menú" });
  const close = menu.getByRole("button", { name: "Cerrar menú" });
  await expect(close).toBeFocused();
  await expect(menu.getByRole("link", { name: "Registrarse" })).toBeVisible();
  await page.locator("main").evaluate(main => main.focus());
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Abrir buscador" }).click();
  const search = page.getByRole("searchbox", { name: "Buscar productos" });
  await expect(search).toBeFocused();
  await search.fill("nike");
  await expect(page.getByText("Las sugerencias no están disponibles. Puedes buscar igualmente.")).toBeVisible();
  await search.press("Escape");
  await expect(search).toBeFocused();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/catalogo\?q=nike$/);
  await expect(search).not.toBeVisible();
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("footer has approved routes and checkout uses a reduced header", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByText("Descubre las ofertas del catálogo")).toHaveCount(0);
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
  await expect(footer.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacidad");
  await page.goto("/checkout");
  await expect(header.getByRole("searchbox")).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Ingresar", exact: true })).toBeVisible();
});

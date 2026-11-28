import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function capture(page: Page, state: string) {
  const folder = process.env.H5_CATALOGO_CAPTURAS;
  if (folder) await page.screenshot({
    path: join(folder, `${state}-${page.viewportSize()?.width}.png`),
    fullPage: !state.startsWith("filtros"), animations: "disabled",
  });
}

for (const width of [1366, 390]) {
  test(`Catálogo ${width} px distingue carga, error y vacío con criterios conservados`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    const categories = [{ categoryId: "running", name: "Running" }];
    await page.route("**/api/catalog/home", route => route.fulfill({ json: { categories, featuredProducts: [] } }));
    await page.route("**/api/catalog/filters", route => route.fulfill({ json: { categories, brands: [] } }));

    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let failed = true;
    await page.route("**/api/catalog/products?**", async route => {
      await pending;
      return failed
        ? route.fulfill({ status: 503, json: { code: "CATALOG_TIMEOUT" } })
        : route.fulfill({ json: { data: [], page: { number: 0, size: 24, totalElements: 0, totalPages: 0 } } });
    });
    await page.goto("/catalogo?minPrice=0&maxPrice=499");
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { level: 1 });
    const chip = main.getByRole("button", { name: /Quitar precio máximo/ });
    try {
      await expect(main.getByRole("status", { name: "Cargando productos" })).toBeVisible();
      await expect(chip).toBeVisible();
      await capture(page, "cargando");
    } finally {
      release();
    }
    await expect(main.getByRole("heading", { name: "El catálogo tardó demasiado" })).toBeVisible();
    await expect(main.getByRole("alert")).toContainText("tardó demasiado");
    await expect(main.getByRole("heading", { name: "Sin resultados" })).toHaveCount(0);
    await capture(page, "error");
    failed = false;
    await main.getByRole("button", { name: "Reintentar" }).click();
    await expect(main.getByRole("heading", { name: "Sin resultados" })).toBeVisible();
    await expect(chip).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL("/catalogo?minPrice=0&maxPrice=499");
    await capture(page, "vacio");

    if (width === 390) {
      const trigger = main.getByRole("button", { name: "Filtros (2)" });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Filtros" });
      await expect(dialog.getByRole("heading")).toBeFocused();
      await expect(dialog.getByLabel("Precio máximo")).toHaveValue("499");
      await capture(page, "filtros");
      await dialog.getByLabel("Precio mínimo").fill("600");
      await expect(dialog.getByRole("alert")).toContainText("mínimo");
      await expect(dialog.getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();
      await capture(page, "filtros-error");
      await dialog.getByRole("button", { name: "Cancelar" }).click();
      await expect(trigger).toBeFocused();
      await expect(page).toHaveURL("/catalogo?minPrice=0&maxPrice=499");
    }
    expect(errors).toEqual([]);
  });
}

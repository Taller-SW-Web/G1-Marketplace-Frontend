import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // The demo does not depend on catalog; this also avoids unrelated backend noise.
  await page.route("**/api/catalog/**", route => route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } }));
  await page.goto("/demo/h3/favoritos");
  await expect(page.getByText("Sin sesión activa.", { exact: true })).toBeVisible();
});

test("MOCK HTTP: keyboard dialog, focus return and no anonymous POST", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/wishlist/**", route => { posts++; return route.fulfill({ status: 500 }); });
  const save = page.getByRole("region", { name: "Producto de demostración" }).getByRole("button", { name: "Guardar en favoritos" });
  await save.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Se requiere una sesión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ahora no" })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Ahora no" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(save).toBeFocused(); expect(posts).toBe(0);
});

test("MOCK HTTP: confirmation, duplicate click, 204 and identity reset", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/wishlist/**", async route => {
    calls++; await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill(route.request().method() === "DELETE" ? { status: 204 } : { status: 201, json: { productId: "PRD-1" } });
  });
  await page.getByLabel("Identidad ficticia").selectOption("A");
  await expect(page.getByText("Cliente de prueba A activo.", { exact: true })).toBeVisible();
  const region = page.getByRole("region", { name: "Producto de demostración" });
  const save = region.getByRole("button", { name: "Guardar en favoritos" });
  await expect(save).not.toHaveAttribute("aria-pressed");
  await save.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toHaveCount(2); expect(calls).toBe(1);
  await region.getByRole("button", { name: "Quitar de favoritos" }).click();
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Identidad ficticia").selectOption("B");
  await expect(region.getByRole("button", { name: "Guardar en favoritos" })).not.toHaveAttribute("aria-pressed");
});

test("MOCK HTTP: 404, 503 and uncertain timeout never show saved", async ({ page }) => {
  await page.getByLabel("Identidad ficticia").selectOption("A");
  await expect(page.getByText("Cliente de prueba A activo.", { exact: true })).toBeVisible();
  for (const code of ["PRODUCT_NOT_AVAILABLE", "CATALOG_UNAVAILABLE", "RESULT_UNCERTAIN"]) {
    await page.route("**/api/wishlist/items", route => route.fulfill({ status: code === "PRODUCT_NOT_AVAILABLE" ? 404 : code === "CATALOG_UNAVAILABLE" ? 503 : 504, json: { code } }));
    const region = page.getByRole("region", { name: "Producto de demostración" });
    await region.getByRole("button", { name: "Guardar en favoritos" }).click(); await expect(region.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toHaveCount(0);
    await page.unroute("**/api/wishlist/items");
  }
});

test("MOCK HTTP: mobile reflow and touch targets", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const box = await page.getByRole("button", { name: "Guardar en favoritos" }).first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

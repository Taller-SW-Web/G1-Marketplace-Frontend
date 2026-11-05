import { test, expect } from "@playwright/test";

// Products use real Next -> BFF HTTP with synthetic data. Only the anonymous session is a browser fixture.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/session", route => route.fulfill({ json: { authenticated: false, scope: "anonymous" } }));
});

for (const width of [1366, 390]) {
  test(`editorial MOCK order and public cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Destacados para ti", exact: true })).toBeVisible();
    const cards = page.locator(".featured-section .product-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.locator(".product-card-link h2")).toHaveText(["Mochila deportiva 03", "Zapatillas de running 01"]);
    await expect(cards.locator(".product-card-link").first()).toHaveAttribute("href", "/productos/producto-demostracion-3?returnTo=%2F");
    await expect(page.getByRole("note")).toContainText("demostración");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/featured-mock-${width}.png`, fullPage: true });
  });
}

test("curated card reaches its existing product detail and returns to Home", async ({ page }) => {
  await page.goto("/");
  await page.locator(".featured-section .product-card-link").first().click();
  await expect(page).toHaveURL(/productos\/producto-demostracion-3/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mochila deportiva 03");
  await page.goBack();
  await expect(page.locator(".featured-section .product-card-link h2")).toHaveText(["Mochila deportiva 03", "Zapatillas de running 01"]);
});

test("anonymous favorite asks for a session without making a wishlist mutation", async ({ page }) => {
  let mutations = 0;
  page.on("request", request => { if (request.url().includes("/api/wishlist/items") && request.method() !== "GET") mutations++; });
  await page.goto("/");
  const button = page.locator(".featured-section").getByRole("button", { name: "Guardar en favoritos" }).first();
  await expect(button).toBeEnabled();
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Se requiere una sesión" });
  await expect(dialog).toBeVisible();
  await dialog.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
  expect(mutations).toBe(0);
});

test("public Home response preserves synthetic source and excludes management data", async ({ request }) => {
  const response = await request.get("/api/catalog/home");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-catalog-source"]).toBe("MOCK");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = await response.json();
  expect(body.featuredProducts.map((card: { productId: string }) => card.productId)).toEqual(["mock-product-3", "mock-product-1"]);
  for (const card of body.featuredProducts) expect(Object.keys(card).sort()).toEqual(["brandId", "categoryId", "image", "name", "productId", "slug"]);
});

import { expect, test } from "@playwright/test";

type FavoriteDTO = {
  productId: string;
  createdAt: string;
  name: string;
  slug: string;
  brand: string;
  image: { url: string; alt: string };
  price: null;
  availability: "AVAILABLE";
};

test("FE #98: catálogo MOCK → ficha → carrito → favoritos", async ({ page }) => {
  const favorites: FavoriteDTO[] = [];
  const cartItems: Array<{ sku: string; name: string; quantity: number; unitPrice: { amount: number; currency: string } }> = [];

  // The H3 identity and wishlist APIs are deliberately stubbed in the browser;
  // this checks the UI handoff, not G7 auth or Backend persistence/ownership.
  await page.route("**/api/h3/session", route => route.fulfill({
    json: { enabled: true, identity: "A", scope: "fe98-ui-fixture" },
  }));
  await page.route("**/api/wishlist", route => route.fulfill({ json: favorites }));
  await page.route("**/api/wishlist/items", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON() as { productId?: string };
    const productId = body.productId ?? "";
    if (!favorites.some(item => item.productId === productId)) {
      favorites.push({
        productId,
        createdAt: "2026-11-04T12:00:00.000Z",
        name: "Zapatillas de running 01",
        slug: "producto-demostracion-1",
        brand: "BrandMock",
        image: { url: "/fixtures/product-0.svg", alt: "Zapatillas de running de demostración" },
        price: null,
        availability: "AVAILABLE",
      });
    }
    await route.fulfill({ status: 201, json: { productId } });
  });
  await page.route("**/api/wishlist/items/*", async route => {
    if (route.request().method() !== "DELETE") return route.continue();
    const productId = new URL(route.request().url()).pathname.split("/").at(-1);
    const index = favorites.findIndex(item => item.productId === productId);
    if (index >= 0) favorites.splice(index, 1);
    await route.fulfill({ status: 204, body: "" });
  });

  // Cart calls are also stubbed to keep this demo independent of database state.
  await page.route("**/api/cart/current/items", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON() as { sku?: string; productId?: string; quantity?: number };
    const sku = body.sku ?? body.productId ?? "";
    const existing = cartItems.find(item => item.sku === sku);
    if (existing) existing.quantity += body.quantity ?? 1;
    else cartItems.push({ sku, name: "Zapatillas de running 01", quantity: body.quantity ?? 1,
      unitPrice: { amount: 10, currency: "PEN" } });
    await route.fulfill({ status: 201, json: { data: { cartId: "cart-fe98-fixture", version: 1, items: cartItems } } });
  });
  await page.route("**/api/cart/current", route => route.fulfill({
    json: { data: { cartId: "cart-fe98-fixture", version: 1, items: cartItems } },
  }));

  await page.goto("/catalogo");
  await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Productos e imágenes de prueba");

  const product = page.locator(".product-card").filter({ hasText: "Zapatillas de running 01" });
  await expect(product).toBeVisible();
  await product.getByRole("button", { name: "Guardar en favoritos" }).click();
  await expect(product.getByRole("status").filter({ hasText: "Guardado en favoritos." })).toBeVisible();

  await product.getByRole("link", { name: /Zapatillas de running 01/ }).click();
  await expect(page).toHaveURL(/\/productos\/producto-demostracion-1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zapatillas de running 01");
  await expect(page.getByText("Producto ficticio [MOCK]", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /agregar al carrito/i }).click();
  await expect(page.locator("[data-testid='added-to-cart-feedback']")).toBeVisible();

  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Carrito de compras" })).toBeVisible();
  await expect(page.getByText("SKU: mock-product-1", { exact: true })).toBeVisible();

  await page.goto("/favoritos");
  await expect(page.getByRole("heading", { name: "Zapatillas de running 01" })).toBeVisible();
  await page.getByRole("button", { name: "Eliminar de favoritos: Zapatillas de running 01" }).click();
  await expect(page.getByRole("heading", { name: "Zapatillas de running 01" })).toHaveCount(0);
  expect(favorites).toHaveLength(0);
});

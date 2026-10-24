import { test, expect } from "@playwright/test";

/**
 * Prueba de Integración End-to-End (E2E):
 * Catálogo ➔ Ficha de Producto ➔ Agregar al Carrito ➔ Carrito de Compras ➔ Checkout
 * 
 * Verifica la unión real entre los módulos F-011 (Catálogo/Ficha),
 * F-016 (Acción de Agregar al Carrito) y F-019 (Vista de Carrito).
 */
test.describe("Integración E2E: Catálogo ➔ Carrito ➔ Checkout", () => {
  test("el usuario puede ver el producto, agregarlo al carrito y transicionar al checkout", async ({ page }) => {
    // 1. Simular la respuesta del BFF para el producto y el carrito
    const mockProduct = {
      productId: "prod-e2e-001",
      slug: "zapatillas-running-e2e",
      name: "Zapatillas Running Inka Pro",
      brand: { brandId: "brand-inka", name: "Inka Athletics" },
      description: "Zapatillas de alto rendimiento para asfalto.",
      technicalSpecifications: [
        { name: "Superficie", value: "Asfalto", displayOrder: 1 },
      ],
      media: [
        { mediaId: "m1", type: "IMAGE" as const, url: "https://images.example.test/product-0.jpg", alt: "Zapatillas Running", displayOrder: 1 },
      ],
    };

    const cartItems: Array<{ sku: string; name?: string; quantity: number; unitPrice?: { amount: number; currency: string } }> = [];

    // Interceptar llamadas al BFF de Catálogo
    await page.route("**/api/catalog/products/*", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: mockProduct,
          meta: { source: "MOCK", retrievedAt: new Date().toISOString() },
        },
      });
    });

    // Interceptar llamadas al BFF del Carrito para simular persistencia
    await page.route("**/api/cart/current/items", async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const existing = cartItems.find((it) => it.sku === body.sku);
        if (existing) {
          existing.quantity += body.quantity || 1;
        } else {
          cartItems.push({
            sku: body.sku,
            name: "Zapatillas Running Inka Pro",
            quantity: body.quantity || 1,
            unitPrice: { amount: 199.9, currency: "PEN" },
          });
        }
        await route.fulfill({
          status: 201,
          json: {
            data: {
              cartId: "cart-e2e-test",
              version: 1,
              items: cartItems,
            },
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/cart/current", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            cartId: "cart-e2e-test",
            version: 1,
            items: cartItems,
          },
        },
      });
    });

    // 2. Visitar la ficha del producto
    await page.goto("/productos/zapatillas-running-e2e");

    // Verificar que la ficha cargó el título
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // 3. Verificar que el botón 'Agregar al carrito' está presente y disponible
    const addToCartButton = page.getByRole("button", { name: /agregar al carrito/i });
    await expect(addToCartButton).toBeVisible();
    await expect(addToCartButton).toBeEnabled();

    // 4. Hacer clic en 'Agregar al carrito'
    await addToCartButton.click();

    // 5. Verificar que aparece el feedback/toast de adición exitosa (Overlay O-005)
    const feedbackBanner = page.locator("[data-testid='added-to-cart-feedback']");
    await expect(feedbackBanner).toBeVisible();
    await expect(feedbackBanner).toContainText(/producto agregado al carrito/i);

    // 6. Navegar a la vista del carrito mediante el botón 'Ver carrito' o navegación
    await page.goto("/carrito");

    // 7. Verificar que el carrito ya no está vacío y renderiza el producto
    await expect(page.getByRole("heading", { name: "Carrito de compras" })).toBeVisible();
    await expect(page.getByText("Tu carrito está vacío")).not.toBeVisible();
    await expect(page.getByText(/SKU: prod-e2e-001/i)).toBeVisible();

    // 8. Verificar que el subtotal y el botón de Checkout están presentes
    await expect(page.locator(".cart-subtotal-amount")).toBeVisible();
    await expect(page.locator(".cart-subtotal-amount")).toContainText("199.90");
    const checkoutButton = page.getByRole("button", { name: "Iniciar Checkout" });
    await expect(checkoutButton).toBeVisible();
    await expect(checkoutButton).toBeEnabled();

    // 9. Proceder al Checkout
    await checkoutButton.click();
    await expect(page).toHaveURL(/\/checkout/);
  });
});

import { expect, test } from "@playwright/test";

const preview = "/demo/h3/favoritos/lista";
const first = "Nike Air Zoom Pegasus 41";

test("ready, optimistic removal, confirmed undo, keyboard focus and empty state", async ({ page }) => {
  await page.goto(preview);
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
  await page.getByRole("button", { name: `Eliminar de favoritos: ${first}` }).click();
  await expect(page.getByRole("heading", { name: "Terrex Swift R3 GTX" })).toBeFocused();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
  await expect(page.getByRole("heading", { name: first })).toBeFocused();
  await expect(page.getByText("Producto restaurado", { exact: true })).toBeVisible();
  await page.getByLabel("Estado de favoritos").selectOption("vacio");
  await expect(page.getByRole("heading", { name: "Aún no tienes favoritos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorar productos" })).toHaveAttribute("href", "/catalogo");
});

test("loading is explicit and catalog failure retries without a false empty state", async ({ page }) => {
  await page.goto(preview + "?estado=cargando");
  await expect(page.getByRole("status", { name: "Cargando tus favoritos" })).toBeVisible();
  await expect(page.getByText("Aún no tienes favoritos")).toHaveCount(0);
  await page.getByRole("button", { name: "Completar operación simulada" }).click();
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
  await page.goto(preview + "?estado=error-catalogo");
  await expect(page.getByRole("heading", { name: "No pudimos cargar tus favoritos" })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
});

test("confirmed removal of the last favorite focuses the empty heading and does not cover its CTA", async ({ page }) => {
  await page.goto(preview);
  for (const name of [first, "Terrex Swift R3 GTX", "Trail Series 710 ml"]) {
    await page.getByRole("button", { name: `Eliminar de favoritos: ${name}` }).click();
    await expect(page.getByRole("button", { name: `Cerrar eliminación de ${name}` })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Aún no tienes favoritos" })).toBeFocused();
  const explore = page.getByRole("link", { name: "Explorar productos" });
  await expect(explore).toBeVisible();
  const boxes = await Promise.all([explore.boundingBox(), page.locator(".favorites-toasts").boundingBox()]);
  expect(boxes[0]!.y + boxes[0]!.height).toBeLessThan(boxes[1]!.y);
});

test("out of stock and retired have distinct sections and remain removable", async ({ page }) => {
  await page.goto(preview + "?estado=agotados");
  const out = page.getByRole("region", { name: "Sin existencias (1)" });
  await expect(out.getByText("Sin existencias", { exact: true })).toBeVisible();
  await out.getByRole("button", { name: "Eliminar de favoritos: Nano Puff Vest" }).click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(out.getByRole("button", { name: "Eliminar de favoritos: Nano Puff Vest" })).toBeVisible();
  await page.goto(preview + "?estado=retirado");
  const retired = page.getByRole("region", { name: "Productos no disponibles (1)" });
  await expect(retired.getByText("Imagen no disponible")).toBeVisible();
  await expect(retired.getByRole("button", { name: "Eliminar de favoritos: Nano Puff Vest" })).toBeEnabled();
});

test("remove and restore failures never claim success", async ({ page }) => {
  await page.goto(preview + "?estado=error-quitar");
  await expect(page.getByText("No pudimos quitar el producto", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
  await page.goto(preview + "?estado=error-restaurar");
  await expect(page.getByText("No pudimos restaurar el producto", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: first })).toHaveCount(0);
});

test("HTTP container loads the proposed DTO and clears private data after 401", async ({ page }) => {
  await page.route("**/api/h3/session", route => route.fulfill({ json: { enabled: true, identity: "A", scope: "test-scope" } }));
  await page.route("**/api/wishlist", route => route.fulfill({ json: [{ productId: "P1", createdAt: "2026-10-16T12:00:00.000Z", name: "Producto privado", slug: "producto-privado", brand: null, image: null, price: null, availability: "AVAILABLE" }] }));
  await page.route("**/api/wishlist/items/P1", route => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }));
  await page.goto("/favoritos");
  await expect(page.getByRole("heading", { name: "Producto privado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Producto privado" })).toHaveAttribute("href", "/productos/producto-privado?returnTo=%2Ffavoritos");
  await page.getByRole("button", { name: "Eliminar de favoritos: Producto privado" }).click();
  await expect(page.getByRole("heading", { name: "Producto privado" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Vuelve a iniciar sesión" })).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect(page.getByRole("heading", { name: "Tus favoritos te esperan" })).toBeFocused();
});

test("favorites use the shared site header and footer", async ({ page }) => {
  await page.route("**/api/h3/session", route => route.fulfill({ json: { enabled: true, identity: "A", scope: "shared-chrome-scope" } }));
  await page.route("**/api/wishlist", route => route.fulfill({ json: [] }));
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.goto("/favoritos");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Inka Athletics, inicio" })).toBeVisible();
    await expect(header.getByRole("searchbox", { name: "Buscar productos" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Favoritos" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Carrito de compras" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("INKA ATHLETICS");
    const reachesBottom = await footer.evaluate(node => Math.abs(node.getBoundingClientRect().bottom - document.documentElement.scrollHeight) <= 1);
    expect(reachesBottom).toBe(true);
  }
});

test("favorites navigate to the integrated detail", async ({ page }) => {
  await page.route("**/api/h3/session", route => route.fulfill({ json: { enabled: true, identity: "A", scope: "navigation-scope" } }));
  await page.route("**/api/wishlist", route => route.fulfill({ json: [{ productId: "P1", createdAt: "2026-10-16T12:00:00.000Z", name: "Producto navegable", slug: "producto-demostracion-5", brand: null, image: null, price: null, availability: "AVAILABLE" }] }));
  await page.goto("/favoritos");
  await page.getByRole("link", { name: "Producto navegable" }).getByRole("heading", { name: "Producto navegable" }).click();
  await expect(page).toHaveURL(/\/productos\/producto-demostracion-5\?returnTo=%2Ffavoritos$/);
  // El contenido de la ficha lo cubre product-detail.e2e.spec.ts (requiere el BFF); aquí solo el handoff.
});

test("responsive images, original SVG dimensions and all state screens", async ({ page }) => {
  test.setTimeout(90000);
  for (const scenario of ["lista", "vacio", "cargando", "error-catalogo", "agotados", "retirado", "quitando", "error-quitar", "eliminado", "restaurando", "restaurado", "error-restaurar", "sesion-vencida"]) {
    await page.goto(preview + "?estado=" + scenario);
    await expect(page.getByRole("heading", { name: "Tus favoritos", exact: true })).toBeVisible();
    if (scenario !== "cargando") await expect(page.getByRole("status", { name: "Cargando tus favoritos" })).toHaveCount(0);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const geometry = await page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('img[src*="/figma/favorite-"][src$=".svg"]')].filter(img => img.getBoundingClientRect().width > 0).every(img => {
        const bounds = img.getBoundingClientRect(); return bounds.width === Number(img.getAttribute("width")) && bounds.height === Number(img.getAttribute("height"));
      }));
      expect(geometry).toBe(true);
    }
  }
});

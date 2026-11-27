import { test, expect, type Page } from "@playwright/test";

/**
 * Regresión visual H5 (FE #155).
 *
 * Tres rutas del corte (inicio, catálogo y ficha V-007) en escritorio y móvil.
 * Las imágenes remotas del MOCK se sustituyen por un SVG determinista para que
 * el snapshot mida la UI y no la disponibilidad de placehold.co.
 */

const ROUTES = [
  { name: "inicio", path: "/" },
  { name: "catalogo", path: "/catalogo" },
  { name: "ficha", path: "/productos/producto-demostracion-4" },
] as const;

/** Placeholder local equivalente a las imágenes MOCK de 600x400. */
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#e8e4dc"/>
  <rect x="24" y="24" width="552" height="352" fill="#d7d2c8"/>
</svg>`;

async function stubRemoteImages(page: Page) {
  await page.route("https://placehold.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: PLACEHOLDER,
    }),
  );
}

for (const route of ROUTES) {
  test(`${route.name} · referencia visual`, async ({ page }) => {
    await stubRemoteImages(page);
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    if (route.name === "ficha") {
      await expect(
        page.getByRole("heading", { name: "Productos relacionados" }),
      ).toBeVisible({ timeout: 15_000 });
    }
    if (route.name === "catalogo") {
      await expect(page.locator(".product-card").first()).toBeVisible({
        timeout: 15_000,
      });
    }

    // Fuentes y placeholders ya resueltos.
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });

    // En la ficha se guarda además una captura del visor (V-007/O-002).
    if (route.name === "ficha") {
      await page.getByRole("button", { name: "Ampliar imagen" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveScreenshot("ficha-viewer.png");
      await page.keyboard.press("Escape");
    }
  });
}

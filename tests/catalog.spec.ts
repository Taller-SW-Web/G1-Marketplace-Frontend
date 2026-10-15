import { test, expect } from "@playwright/test";

test("home loads mock categories through Next → BFF and keeps featured omitted", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tu siguiente",
  );
  await expect(page.getByRole("link", { name: /Running/ })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("demostración");
  await expect(
    page.getByRole("heading", { name: "Destacados", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/inicio-desktop.png",
    fullPage: true,
  });
  await page.locator(".category-card").first().click();
  await expect(page).toHaveURL(/categoryIds=running/);
  await expect(page.locator(".product-card")).toHaveCount(11);
  await expect(
    page.getByRole("button", { name: "Quitar categoría Running" }),
  ).toBeVisible();
});

test("search normalizes query, preserves URL and has working clear", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("  polo   entrenamiento  ");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=polo\+entrenamiento/);
  // This phrase is not contiguous in synthetic names, so empty is an actual success state.
  await expect(
    page.getByRole("heading", { name: /No encontramos productos/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar búsqueda", exact: true })
    .click();
  await expect(page).toHaveURL("/catalogo");
  await expect(page.locator(".product-card")).toHaveCount(24);
});

test("query 1/121 characters never requests products", async ({ page }) => {
  let productRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/catalog/products")) productRequests++;
  });
  await page.goto("/");
  for (const q of ["x", "x".repeat(121)]) {
    await page.getByRole("searchbox").fill(q);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.locator("#search-error")).toHaveText(
      "Escribe entre 2 y 120 caracteres.",
    );
  }
  expect(productRequests).toBe(0);
  await page.goto("/catalogo?q=x");
  await expect(
    page.getByRole("heading", { name: "Revisa tu búsqueda" }),
  ).toBeVisible();
  expect(productRequests).toBe(0);
});

test("search returns real fixture matches and does not invent prices or stock", async ({
  page,
}) => {
  await page.goto("/catalogo?q=running");
  await expect(page.locator(".product-card")).toHaveCount(16);
  await expect(page.getByRole("status")).toHaveText("16 productos");
  await expect(page.locator(".product-grid")).not.toContainText("S/");
  const href = await page
    .locator(".product-card a")
    .first()
    .getAttribute("href");
  expect(href).toContain("/productos/");
  expect(href).toContain("returnTo=");
});

test("pagination retains criteria, updates focus and respects first/last", async ({
  page,
}) => {
  await page.goto("/catalogo");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(page.getByRole("button", { name: "← Anterior" })).toBeDisabled();
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(page.locator(".product-card")).toHaveCount(8);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Siguiente →" }),
  ).toBeDisabled();
  await page.getByRole("searchbox").fill("running");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL("/catalogo?q=running");
  await expect(page.locator(".product-card")).toHaveCount(16);
});

test("recoverable provider error stays an error, preserves q and retries", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/catalog/products*", async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        json: { code: "CATALOG_UNAVAILABLE" },
      });
    } else await route.continue();
  });
  await page.goto("/catalogo?q=polo");
  await expect(page.locator('p[role="alert"]')).toContainText(
    "No pudimos cargar",
  );
  await expect(
    page.getByRole("heading", { name: /No encontramos productos/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveValue("polo");
  fail = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
});

test("out-of-range page offers recovery without retry loop", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/catalog/products")) requests++;
  });
  await page.goto("/catalogo?page=999");
  await expect(
    page.getByRole("heading", { name: "Esta página ya no tiene productos" }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole("link", { name: "Ver catálogo completo" }).click();
  await expect(page.locator(".product-card")).toHaveCount(24);
});

test("unapproved URL criteria rejected and upstream details not exposed", async ({
  page,
}) => {
  await page.goto("/catalogo?sort=PRICE_ASC");
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Revisa los criterios",
  );
  await expect(page.locator(".product-card")).toHaveCount(0);
});

test("slow old response cannot overwrite new query", async ({ page }) => {
  await page.route("**/api/catalog/products?q=running", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    try {
      await route.continue();
    } catch {
      /* Browser aborts the old request. */
    }
  });
  await page.goto("/catalogo?q=running");
  await page.getByRole("searchbox").fill("polo");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await expect(page.locator(".product-grid")).toContainText("Polo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("polo");
});

test("mobile fits viewport, uses visible labels and exposes keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalogo?q=running");
  await expect(page.locator(".product-card")).toHaveCount(16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("searchbox").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Buscar" })).toBeFocused();
  await page.screenshot({
    path: "test-results/catalogo-mobile.png",
    fullPage: true,
  });
});

test("query text is escaped and long query has no horizontal overflow", async ({
  page,
}) => {
  await page.goto(
    `/catalogo?q=${encodeURIComponent("<img src=x onerror=alert(1)>")}`,
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText("<img");
  await expect(page.locator("h1 img")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/catalogo?q=${"a".repeat(120)}`);
  await expect(
    page.getByRole("heading", { name: /No encontramos productos/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("empty home omits category/featured headings and preserves navigation", async ({
  page,
}) => {
  await page.route("**/api/catalog/home", (route) =>
    route.fulfill({
      json: { categories: [], featuredProducts: [] },
      headers: { "X-Catalog-Source": "MOCK" },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Encuentra tu próxima elección" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explora por categoría" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Destacados", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toBeVisible();
});

test("invalid public payload is a recoverable error, never an empty catalog", async ({
  page,
}) => {
  await page.route("**/api/catalog/products*", (route) =>
    route.fulfill({
      json: {
        data: [{ name: "Incomplete card" }],
        page: { number: 0, size: 24, totalElements: 1, totalPages: 1 },
      },
    }),
  );
  await page.goto("/catalogo");
  await expect(page.locator('p[role="alert"]')).toContainText(
    "No pudimos cargar",
  );
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
});

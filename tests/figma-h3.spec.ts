import { test, expect } from "@playwright/test";

test("Figma home uses the editorial asset and responsive category geometry", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for(const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".category-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("EL MOVIMIENTOEMPIEZA CONTIGO.");
    await expect(page.getByText("Buscar productos", { exact: true })).toBeVisible();
    const hero = await page.locator(".home-intro").boundingBox();
    expect(hero?.width).toBe(width === 1440 ? 1320 : width - 32);
    await expect.poll(async () => page.locator('img[src^="/figma/"]:visible').evaluateAll(
      (images) => images.every((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0),
    )).toBe(true);
    if (width < 768) {
      const textStart = await page.getByRole("searchbox").evaluate((input) =>
        input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft),
      );
      const icon = await page.locator(".search-submit img").boundingBox();
      expect(textStart).toBeGreaterThanOrEqual(icon!.x + icon!.width + 8);
    }
    const photo = await page.locator(".intro-art img").boundingBox();
    expect(photo!.width).toBe(width === 1440 ? 580 : width === 390 ? 294 : 240);
    expect(photo!.width / photo!.height).toBeCloseTo(1.5, 2);
    const assets = await page.locator('img[src^="/figma/"]:visible').evaluateAll((images) => images.map((element) => {
      const image = element as HTMLImageElement;
      const rect = image.getBoundingClientRect();
      return { src: image.getAttribute("src"), loaded: image.complete && image.naturalWidth > 0, width: rect.width, height: rect.height };
    }));
    expect(assets.every((asset) => asset.loaded && asset.width > 0 && asset.height > 0)).toBe(true);
    const illustration = assets.find((asset) => asset.src?.includes("category-shoe"));
    expect(illustration).toBeDefined();
    expect(illustration!.width / illustration!.height).toBeCloseTo(1.5, 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if(width !== 320) await page.screenshot({ path: `test-results/figma-inicio-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("Figma catalog has three desktop columns and one mobile column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/catalogo?q=running");
  await expect(page.locator(".product-card")).toHaveCount(16);
  const cards = page.locator(".product-card");
  const first = await cards.nth(0).boundingBox();
  const third = await cards.nth(2).boundingBox();
  const fourth = await cards.nth(3).boundingBox();
  expect(first?.y).toBe(third?.y);
  expect(fourth!.y).toBeGreaterThan(first!.y);
  expect(first?.width).toBe(320);
  await page.screenshot({ path: "test-results/figma-catalogo-1440.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFirst = await cards.nth(0).boundingBox();
  const mobileSecond = await cards.nth(1).boundingBox();
  expect(mobileFirst?.width).toBe(358);
  expect(mobileFirst?.x).toBe(16);
  expect(mobileSecond!.y).toBeGreaterThan(mobileFirst!.y);
  await expect(page.getByRole("button", { name: /Iniciar sesión/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Favoritos/ })).toBeDisabled();
  await expect(page.locator(".product-grid")).not.toContainText("S/");
});

test("home loading and error follow Figma and retry preserves a usable search", async ({ page }) => {
  let release: () => void = () => { };
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let fail = true;
  await page.route("**/api/catalog/home", async (route) => {
    await pending;
    if(fail) await route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } });
    else await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Preparando tu inicio" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await page.screenshot({ path: "test-results/figma-inicio-cargando-390.png", fullPage: true });
  release();
  await expect(page.locator(".feedback-error--home")).toBeVisible();
  await expect(page.locator('.feedback img')).toHaveAttribute("src", "/figma/error-24.svg");
  await page.screenshot({ path: "test-results/figma-inicio-error-390.png", fullPage: true });
  fail = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator(".category-card")).toHaveCount(3);
});

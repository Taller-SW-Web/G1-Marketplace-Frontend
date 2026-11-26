import { test, expect } from '@playwright/test';

test('H4 removing the search chip leaves focus on the results heading', async ({ page }) => {
  await page.goto('/catalogo?q=running&pageSize=4');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Quitar búsqueda running' }).click();
  await expect(page).toHaveURL(url => !url.searchParams.has('q'));
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('H4 mobile unchanged apply restores results focus and shows applied filter count', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo?categoryIds=running&brandIds=mock-brand&minPrice=0&pageSize=4');
  await expect(page.locator('.product-card')).toHaveCount(4);
  const trigger = page.getByRole('button', { name: 'Filtros (3)', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await expect(dialog.getByText('3 filtros aplicados', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Aplicar filtros' })).toBeEnabled();
  const originalUrl = page.url();
  await dialog.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('H4 visual surfaces keep desktop hierarchy and usable mobile toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.category-card').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/h4-visual-inicio-desktop.png', fullPage: true });
  await page.goto('/catalogo?pageSize=4');
  await expect(page.locator('.product-card')).toHaveCount(4);
  const panel = page.locator('.catalog-filters-desktop');
  await expect(panel).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('.catalog-filters-trigger')).not.toBeVisible();
  const count = await page.locator('.result-count').boundingBox();
  const sort = await page.getByLabel('Ordenar por').boundingBox();
  expect(Math.abs(count!.y + count!.height / 2 - sort!.y - sort!.height / 2)).toBeLessThan(30);
  await page.screenshot({ path: 'test-results/h4-visual-catalogo-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.category-card').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/h4-visual-inicio-mobile.png', fullPage: true });
  await page.goto('/catalogo?pageSize=4');
  await expect(page.locator('.product-card')).toHaveCount(4);
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true });
  const buttonRect = await trigger.boundingBox();
  expect(buttonRect!.width).toBeGreaterThanOrEqual(350);
  const selectRect = await page.getByLabel('Ordenar por').boundingBox();
  expect(selectRect!.width).toBeGreaterThanOrEqual(350);
  await page.screenshot({ path: 'test-results/h4-visual-catalogo-mobile.png', fullPage: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Precio mínimo', { exact: true }).fill('20');
  await dialog.getByLabel('Precio máximo', { exact: true }).fill('10');
  await expect(dialog.getByRole('alert')).toContainText('mínimo');
  await expect(dialog.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/h4-visual-filtros-error-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('H4 home and catalog error or empty states preserve public navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/catalog/home', route => route.fulfill({ status: 503, json: { code: 'CATALOG_UNAVAILABLE' } }));
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await page.screenshot({ path: 'test-results/h4-visual-inicio-error-mobile.png' });
  await page.unroute('**/api/catalog/home');
  await page.goto('/catalogo?q=zzzh4noexiste');
  await expect(page.getByRole('heading', { name: /No encontramos productos/ })).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('zzzh4noexiste');
  await page.screenshot({ path: 'test-results/h4-visual-catalogo-empty-mobile.png' });
});

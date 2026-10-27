import { test, expect } from '@playwright/test';

test('H4 unavailable brands do not block category and price, then retry restores brands', async ({ page }) => {
  let failed = true;
  let homeRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/catalog/home')) homeRequests++; });
  await page.route('**/api/catalog/filters', route => failed ? route.fulfill({ status: 503, json: { code: 'CATALOG_UNAVAILABLE' } }) : route.continue());
  await page.goto('/catalogo?q=running&sort=NAME_ASC&pageSize=4&page=1');
  const form = page.locator('.catalog-filters-desktop form');
  await expect(form.getByLabel('Marca', { exact: true })).toBeDisabled();
  await expect(form.getByLabel('Categoría', { exact: true })).toBeEnabled();
  await expect(form.getByLabel('Precio mínimo', { exact: true })).toBeEnabled();
  // Header navigation also reads home; the failed masters add one recovery read.
  expect(homeRequests).toBe(2);
  await form.getByLabel('Categoría', { exact: true }).selectOption('running');
  await form.getByLabel('Precio mínimo', { exact: true }).fill('10');
  await form.getByLabel('Precio máximo', { exact: true }).fill('100');
  expect(new URL(page.url()).searchParams.get('page')).toBe('1');
  await form.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(url => url.searchParams.get('categoryIds') === 'running' && !url.searchParams.has('page'));
  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(page.locator('.product-card h2')).toHaveText(['Short de running 04', 'Zapatillas de running 01']);
  await expect(page.getByRole('button', { name: 'Quitar categoría Running' })).toBeVisible();
  await form.getByLabel('Precio mínimo', { exact: true }).fill('15');
  failed = false;
  await form.getByRole('button', { name: 'Reintentar filtros' }).click();
  await expect(form.getByLabel('Marca', { exact: true })).toBeEnabled();
  await expect(form.getByLabel('Precio mínimo', { exact: true })).toHaveValue('15');
  expect(homeRequests).toBe(2);
});

test('H4 mobile can apply price without either master and restores applied draft after cancel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/catalog/filters', route => route.fulfill({ status: 503, json: { code: 'CATALOG_UNAVAILABLE' } }));
  await page.route('**/api/catalog/home', route => route.fulfill({ status: 503, json: { code: 'CATALOG_UNAVAILABLE' } }));
  await page.goto('/catalogo?q=running&pageSize=4');
  const trigger = page.locator('.catalog-filters-trigger');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await expect(dialog.getByLabel('Marca', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Categoría', { exact: true })).toBeDisabled();
  await dialog.getByLabel('Precio mínimo', { exact: true }).fill('10');
  await dialog.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(url => url.searchParams.get('minPrice') === '10');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await trigger.click();
  await dialog.getByLabel('Precio mínimo', { exact: true }).fill('99');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel('Precio mínimo', { exact: true })).toHaveValue('10');
});

test('H4 filters apply combined criteria through Next and BFF, preserve URL and clear only filters', async ({ page }) => {
  await page.goto('/catalogo?q=running&sort=NAME_DESC&page=2&pageSize=4');
  const form = page.locator('.catalog-filters-desktop form');
  await expect(form.getByLabel('Marca', { exact: true })).toBeEnabled();
  await form.getByLabel('Marca', { exact: true }).selectOption('mock-brand');
  await form.getByLabel('Precio mínimo', { exact: true }).fill('10');
  await form.getByLabel('Precio máximo', { exact: true }).fill('100');
  await expect(page).toHaveURL(/page=2/);
  await form.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(/brandIds=mock-brand/);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(page).toHaveURL(url => !url.searchParams.has('brandIds'));
  const url = new URL(page.url());
  expect(url.searchParams.get('q')).toBe('running');
  expect(url.searchParams.get('sort')).toBe('NAME_DESC');
  expect(url.searchParams.has('brandIds')).toBe(false);
});

test('H4 ordering is global across pages and page recovery keeps criteria', async ({ page }) => {
  await page.goto('/catalogo?q=running&pageSize=4&page=999');
  await page.getByRole('button', { name: 'Volver a la primera página' }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get('q')).toBe('running');
  await page.getByLabel('Ordenar por').selectOption('NAME_ASC');
  const first = await page.locator('.product-card h2').allTextContents();
  await page.getByRole('button', { name: 'Siguiente →' }).click();
  await expect(page).toHaveURL(/page=1/);
  const second = await page.locator('.product-card h2').allTextContents();
  expect([...first, ...second]).toEqual([...first, ...second].sort((a, b) => a.localeCompare(b, 'es')));
  await page.getByLabel('Ordenar por').selectOption('NAME_DESC');
  await expect(page).toHaveURL(url => url.searchParams.get('sort') === 'NAME_DESC' && !url.searchParams.has('page'));
});

test('H4 mobile modal traps focus, cancels its draft and applies only explicitly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo?q=running');
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Aplicar filtros' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Aplicar filtros' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/h4-filtros-mobile.png' });
  await dialog.getByLabel('Precio mínimo', { exact: true }).fill('99');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(new URL(page.url()).searchParams.has('minPrice')).toBe(false);
  await trigger.click();
  await expect(dialog.getByLabel('Precio mínimo', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Marca', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Marca', { exact: true }).selectOption('mock-brand');
  await dialog.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/brandIds=mock-brand/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/h4-catalog-mobile.png', fullPage: true });
});

test('H4 invalid ranges never call products, while failed masters allow sorting and retry', async ({ page }) => {
  let products = 0;
  page.on('request', request => { if (request.url().includes('/api/catalog/products')) products++; });
  await page.goto('/catalogo?minPrice=20&maxPrice=10');
  await expect(page.locator('p[role="alert"]')).toContainText('mínimo');
  expect(products).toBe(0);
  let failed = true;
  await page.route('**/api/catalog/filters', route => failed ? route.fulfill({ status: 503, json: { code: 'CATALOG_UNAVAILABLE' } }) : route.continue());
  await page.goto('/catalogo');
  await expect(page.locator('.catalog-filters-desktop p[role="alert"]')).toContainText('filtros');
  await expect(page.locator('.product-card')).toHaveCount(24);
  await page.getByLabel('Ordenar por').selectOption('NAME_DESC');
  await expect(page).toHaveURL(/sort=NAME_DESC/);
  failed = false;
  await page.getByRole('button', { name: 'Reintentar filtros' }).click();
  await expect(page.locator('.catalog-filters-desktop').getByLabel('Marca', { exact: true })).toBeEnabled();
});

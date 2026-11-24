import { test, expect } from '@playwright/test';

test('F008 mobile clear applies immediately, closes dialog and preserves context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo?q=running&brandIds=mock-brand&minPrice=10&sort=NAME_ASC&pageSize=4&page=1');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await page.locator('.catalog-filters-trigger').click();
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await dialog.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(url => !url.searchParams.has('minPrice') && !url.searchParams.has('brandIds') && !url.searchParams.has('page'));
  expect(new URL(page.url()).searchParams.get('sort')).toBe('NAME_ASC');
  expect(new URL(page.url()).searchParams.get('q')).toBe('running');
  await expect(page.locator('.result-count')).toContainText('16 productos');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

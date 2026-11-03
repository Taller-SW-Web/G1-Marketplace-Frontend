import { test, expect } from '@playwright/test';

test('F006 rejects duplicate home links while leaving global search usable', async ({ page }) => {
  await page.route('**/api/catalog/home', route => route.fulfill({ json: { categories: [{ categoryId: 'running', name: 'Running' }, { categoryId: 'running', name: 'Duplicate' }], featuredProducts: [] } }));
  await page.goto('/');
  await expect(page.locator('.home-error')).toBeVisible();
  await expect(page.locator('.category-card')).toHaveCount(0);
  await page.getByRole('searchbox').fill('running');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(16);
});

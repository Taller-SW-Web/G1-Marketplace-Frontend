import { test, expect } from '@playwright/test';

test('F007 retries a non-JSON gateway failure and announces fresh results', async ({ page }) => {
  let failed = true;
  await page.route('**/api/catalog/products?**', route => failed ? route.fulfill({ status: 503, contentType: 'text/html', body: '<html>private gateway detail</html>' }) : route.continue());
  await page.goto('/catalogo?q=polo');
  await expect(page.locator('.catalog-results [role="alert"]')).toContainText('No pudimos cargar');
  await expect(page.locator('body')).not.toContainText('private gateway detail');
  failed = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.locator('.result-count')).toHaveText('8 productos');
});

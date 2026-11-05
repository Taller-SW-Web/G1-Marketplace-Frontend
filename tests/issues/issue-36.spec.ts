import { test, expect } from '@playwright/test';

test('F010 invalid page never requests products and explicit recovery retains filters and order', async ({ page }) => {
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/api/catalog/products')) requests++; });
  await page.goto('/catalogo?q=running&categoryIds=running&pageSize=4&sort=NAME_DESC&page=-1');
  await expect(page.getByRole('heading', { name: 'Revisa los criterios del catálogo' })).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get('q')).toBe('running');
  expect(new URL(page.url()).searchParams.get('categoryIds')).toBe('running');
  expect(new URL(page.url()).searchParams.get('sort')).toBe('NAME_DESC');
  expect(requests).toBe(1);
});

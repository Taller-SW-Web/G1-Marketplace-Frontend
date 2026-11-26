import { test, expect } from '@playwright/test';

test('F009 announces changed ordering and history restores sort, filter and page', async ({ page }) => {
  await page.goto('/catalogo?q=running&categoryIds=running&pageSize=4&page=1&sort=NAME_ASC');
  await expect(page.locator('.result-count')).toContainText('Nombre: A a Z');
  await page.getByLabel('Ordenar por').selectOption('NAME_DESC');
  await expect(page.locator('.result-count')).toContainText('Nombre: Z a A');
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  expect(new URL(page.url()).searchParams.get('categoryIds')).toBe('running');
  await page.goBack();
  await expect(page.getByLabel('Ordenar por')).toHaveValue('NAME_ASC');
  await expect(page.locator('.result-count')).toContainText('Nombre: A a Z');
  expect(new URL(page.url()).searchParams.get('page')).toBe('1');
});

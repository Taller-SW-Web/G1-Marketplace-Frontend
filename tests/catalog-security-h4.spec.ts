import { test, expect } from '@playwright/test';

// Bounded active checks against the compiled local Next/BFF stack, synthetic data only.
// No external target, login, mutation, fuzzing loop or load test.
const negativeCases = [
  ['F007', 'q=x', 'INVALID_SEARCH_QUERY'],
  ['F007', 'q=' + 'x'.repeat(121), 'INVALID_SEARCH_QUERY'],
  ['F007', 'q=running&q=polo', 'INVALID_PARAMETERS'],
  ['F008', 'categoryIds=..%2Fprivate', 'INVALID_FILTER'],
  ['F008', 'brandIds=mock-brand%2Cprivate', 'INVALID_FILTER'],
  ['F008', 'minPrice=-1', 'INVALID_PRICE_RANGE'],
  ['F008', 'minPrice=1.001', 'INVALID_PRICE_RANGE'],
  ['F008', 'minPrice=20&maxPrice=10', 'INVALID_PRICE_RANGE'],
  ['F008', 'includeInactive=true', 'INVALID_PARAMETERS'],
  ['F008', 'url=https%3A%2F%2Fexample.invalid', 'INVALID_PARAMETERS'],
  ['F009', 'sort=NAME_ASC%3BDROP', 'INVALID_SORT'],
  ['F009', 'sort=NAME_ASC&sort=NAME_DESC', 'INVALID_PARAMETERS'],
  ['F010', 'page=-1', 'INVALID_PAGE'],
  ['F010', 'pageSize=0', 'INVALID_PAGE'],
  ['F010', 'pageSize=49', 'INVALID_PAGE'],
  ['F010', 'pageSize=1000000', 'INVALID_PAGE'],
  ['F010', 'page=9007199254740992', 'INVALID_PAGE'],
];
for (const [feature, query, code] of negativeCases) {
  test(`${feature} dynamic validation rejects ${query}`, async ({ request }) => {
    const requestId = 'h4-dast-' + feature;
    const response = await request.get('/api/catalog/products?' + query, { headers: { 'X-Request-Id': requestId } });
    expect(response.status()).toBe(400);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(response.headers()['x-request-id']).toBe(requestId);
    expect(response.headers()['content-type']).toContain('application/problem+json');
    const body = await response.json();
    expect(body.code).toBe(code);
    expect(body.requestId).toBe(requestId);
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('diagnostic');
    expect(body).not.toHaveProperty('token');
  });
}

test('F006 public Home/masters expose only public fields and safe category links', async ({ request, page }) => {
  const home = await request.get('/api/catalog/home');
  expect(home.status()).toBe(200);
  expect(home.headers()['x-catalog-source']).toBe('MOCK');
  expect(home.headers()['cache-control']).toBe('no-store');
  const body = await home.json();
  expect(Object.keys(body).sort()).toEqual(['categories', 'featuredProducts']);
  for (const item of body.categories) expect(Object.keys(item).sort()).toEqual(['categoryId', 'name']);
  const filters = await (await request.get('/api/catalog/filters')).json();
  expect(Object.keys(filters).sort()).toEqual(['brands', 'categories']);
  await page.goto('/');
  await expect(page.locator('.category-card')).toHaveCount(body.categories.length);
  for (const href of await page.locator('.category-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
    expect(href).toMatch(/^\/catalogo\?categoryIds=[a-zA-Z0-9_%.-]+$/);
  }
});

for (const payload of ['<img src=x onerror=window.__h4xss=1>', '<svg onload=window.__h4xss=1>', "' OR 1=1 --"]) {
  test('F007 query remains text and never executes: ' + payload, async ({ page, request }) => {
    const dialogs: string[] = [];
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    const api = await request.get('/api/catalog/products?' + new URLSearchParams({ q: payload }));
    expect(api.status()).toBe(200);
    expect((await api.json()).data).toEqual([]);
    await page.goto('/catalogo?' + new URLSearchParams({ q: payload }));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(payload);
    await expect(page.locator('.product-card')).toHaveCount(0);
    expect(await page.evaluate(() => (window as Window & { __h4xss?: number }).__h4xss)).toBeUndefined();
    expect(dialogs).toEqual([]);
    await expect(page.locator('h1 img, h1 svg, h1 script')).toHaveCount(0);
  });
}

test('F006-F010 Next blocks arbitrary proxy destinations and exposes hardened page headers', async ({ request }) => {
  const forbidden = await request.get('/api/catalog/administracion');
  expect(forbidden.status()).toBe(404);
  const home = await request.get('/');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(home.headers()['x-powered-by']).toBeUndefined();
  const catalog = await request.get('/api/catalog/products?pageSize=48');
  expect(catalog.status()).toBe(200);
  const body = await catalog.json();
  expect(body.data.length).toBeLessThanOrEqual(48);
  for (const item of body.data) {
    expect(Object.keys(item).sort()).toEqual(['brandId', 'categoryId', 'image', 'name', 'productId', 'slug']);
    if (item.image) expect(item.image.url).toMatch(/^\/fixtures\/product-\d+\.svg$/);
  }
});

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  test('F006-F010 public proxy rejects mutation method ' + method, async ({ request }) => {
    const response = await request.fetch('/api/catalog/products', { method });
    expect(response.status()).toBe(405);
  });
}

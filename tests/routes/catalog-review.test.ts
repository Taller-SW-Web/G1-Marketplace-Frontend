// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '../../src/app/api/catalog/[...path]/route';
import { isCatalogPage, readCatalog } from '../../src/features/catalog/api';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([
  { error: new DOMException('private detail', 'TimeoutError'), code: 'CATALOG_TIMEOUT' },
  { error: new Error('private detail'), code: 'CATALOG_UNAVAILABLE' },
  { error: new DOMException('private detail', 'AbortError'), code: 'CATALOG_UNAVAILABLE' },
])('keeps safe 503/$code for a proxy transport failure', async ({ error, code }) => {
  vi.stubEnv('MARKETPLACE_API_URL', 'http://127.0.0.1:10400');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  const result = await GET(new Request('http://localhost/api/catalog/products'), { params: Promise.resolve({ path: ['products'] }) });
  expect(result.status).toBe(503);
  expect(result.headers.get('cache-control')).toBe('no-store');
  const body = await result.json();
  expect(body.code).toBe(code);
  expect(body.requestId).toBe(result.headers.get('x-request-id'));
  expect(JSON.stringify(body)).not.toContain('private detail');
});
it('shows timeout separately from unavailability without leaking provider text', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'CATALOG_TIMEOUT', title: 'private upstream body' }, { status: 503 })));
  await expect(readCatalog('products', isCatalogPage, new AbortController().signal)).rejects.toMatchObject({
    code: 'CATALOG_TIMEOUT', message: 'El catálogo tardó demasiado en responder. Inténtalo nuevamente.',
  });
});
it('does not attribute a consumer timeout cancellation to the provider', async () => {
  vi.stubEnv('MARKETPLACE_API_URL', 'http://127.0.0.1:10400');
  const controller = new AbortController();
  const failure = new DOMException('private consumer detail', 'TimeoutError');
  controller.abort(failure);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
  const response = await GET(new Request('http://localhost/api/catalog/products', { signal: controller.signal }), {
    params: Promise.resolve({ path: ['products'] }),
  });
  expect((await response.json()).code).toBe('CATALOG_UNAVAILABLE');
});
it('accepts applied sort and a legacy page, rejecting unknown sort metadata', () => {
  const page = { data: [], page: { number: 0, size: 24, totalElements: 0, totalPages: 0 } };
  for (const sort of [null, 'NAME_ASC', 'NAME_DESC']) expect(isCatalogPage({ ...page, sort })).toBe(true);
  expect(isCatalogPage(page)).toBe(true);
  expect(isCatalogPage({ ...page, sort: 'PRICE_ASC' })).toBe(false);
  expect(isCatalogPage({ ...page, sort: ['NAME_ASC'] })).toBe(false);
});

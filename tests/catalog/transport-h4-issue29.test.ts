// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { isCatalogPage, readCatalog } from '../../src/features/catalog/api';
afterEach(() => vi.unstubAllGlobals());
it.each([503, 502])('normalizes a non-JSON gateway %s without exposing HTML', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>private gateway detail</html>', { status })));
  await expect(readCatalog('products?q=polo', isCatalogPage, new AbortController().signal)).rejects.toMatchObject({
    code: 'CATALOG_UNAVAILABLE', message: 'No pudimos cargar el catálogo. Inténtalo nuevamente.',
  });
});
it('keeps a non-JSON 504 recognizable as timeout', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private timeout', { status: 504 })));
  await expect(readCatalog('products', isCatalogPage, new AbortController().signal)).rejects.toMatchObject({ code: 'CATALOG_TIMEOUT' });
});
it('rejects malformed successful JSON as an invalid response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json')));
  await expect(readCatalog('products', isCatalogPage, new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
it('preserves cancellation while reading a response body', async () => {
  const controller = new AbortController();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => {
    controller.abort(); throw new Error('body cancelled');
  } }));
  await expect(readCatalog('products', isCatalogPage, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});

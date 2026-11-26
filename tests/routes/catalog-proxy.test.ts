// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/catalog/[...path]/route";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Catalog proxy runtime timeout budget", () => {
  it.each([
    { configured: undefined, expected: 8000 },
    { configured: "25000", expected: 25000 },
    { configured: "1000", expected: 1000 },
    { configured: "30000", expected: 30000 },
    { configured: "999", expected: 8000 },
    { configured: "30001", expected: 8000 },
    { configured: "25000oops", expected: 8000 },
    { configured: "NaN", expected: 8000 },
  ])("uses $expected ms for configured budget $configured", async ({ configured, expected }) => {
    vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10400");
    vi.stubEnv("CATALOG_BFF_TIMEOUT_MS", configured);
    const timer = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [] }, { headers: { "X-Catalog-Source": "REAL" } })));
    const response = await GET(new NextRequest("http://localhost/api/catalog/products"), {
      params: Promise.resolve({ path: ["products"] }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-catalog-source")).toBe("REAL");
    expect(timer).toHaveBeenCalledWith(expected);
  });
});

describe("Integrated collection/detail catalog proxy", () => {
  it.each([{ path: ["home"] }, { path: ["products"] }, { path: ["products", "producto-demostracion-5"] }])(
    "forwards the approved Docker BFF path $path without collapsing detail to listing",
    async ({ path }) => {
      vi.stubEnv("MARKETPLACE_API_URL", "http://backend:10000");
      vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "backend");
      const upstream = vi.fn().mockResolvedValue(Response.json({ data: [] }, { headers: { "X-Catalog-Source": "MOCK" } }));
      vi.stubGlobal("fetch", upstream);
      const response = await GET(new NextRequest("http://localhost/api/catalog/products?q=running", { headers: { "X-Request-Id": "proxy-integration-01" } }), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("x-request-id")).toBe("proxy-integration-01");
      expect(upstream.mock.calls[0][1].headers["X-Request-Id"]).toBe("proxy-integration-01");
      expect(String(upstream.mock.calls[0][0])).toBe("http://backend:10000/api/v1/catalog/" + path.join("/") + "?q=running");
      expect(response.headers.get("x-catalog-source")).toBe("MOCK");
      expect(upstream.mock.calls[0][1].redirect).toBe("error");
    },
  );
  it("rejects extra segments and invalid slugs before fetching", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    for (const path of [["products", "Bad_Slug"], ["products", "valid", "extra"]]) {
      const response = await GET(new NextRequest("http://localhost/api/catalog/products"), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    { origin: "http://backend:10000", approved: "" },
    { origin: "http://other-backend:10000", approved: "backend" },
  ])("rejects unapproved internal origin $origin with correlated Problem Details", async ({ origin, approved }) => {
    vi.stubEnv("MARKETPLACE_API_URL", origin);
    vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", approved);
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new NextRequest("http://localhost/api/catalog/home", { headers: { "X-Request-Id": "proxy-integration-02" } }), {
      params: Promise.resolve({ path: ["home"] }),
    });
    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(response.headers.get("x-request-id")).toBe("proxy-integration-02");
    expect(await response.json()).toMatchObject({ status: 503, code: "CATALOG_UNAVAILABLE", requestId: "proxy-integration-02", instance: "/api/catalog/home" });
  });

  it("forwards the backend detail problem and correlation through the approved Docker origin", async () => {
    vi.stubEnv("MARKETPLACE_API_URL", "http://backend:10000");
    vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "backend");
    const problem = { type: "https://marketplace.example.com/problems/product-not-available", title: "Producto no disponible", status: 404,
      code: "PRODUCT_NOT_AVAILABLE", requestId: "bff-integration-01", instance: "/api/v1/catalog/products/missing" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(problem, { status: 404, headers: {
      "Content-Type": "application/problem+json", "X-Catalog-Source": "MOCK", "X-Request-Id": "bff-integration-01",
    } })));
    const response = await GET(new NextRequest("http://localhost/api/catalog/products/missing"), {
      params: Promise.resolve({ path: ["products", "missing"] }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(response.headers.get("x-request-id")).toBe(problem.requestId);
    expect(response.headers.get("x-catalog-source")).toBe("MOCK");
    expect(await response.json()).toEqual(problem);
  });
});

describe('G6 partial REAL integration through the Marketplace proxy', () => {
  it.each([
    { path: 'home', status: 200, body: { categories: [{ categoryId: 'g6-category', name: 'Calzado' }], featuredProducts: [] } },
    { path: 'products', status: 503, body: { status: 503, code: 'CATALOG_UNAVAILABLE', requestId: 'g6-demo-request' } },
  ])('preserves REAL provenance and status $status for $path', async ({ path, status, body }) => {
    vi.stubEnv('MARKETPLACE_API_URL', 'http://backend:10000');
    vi.stubEnv('MARKETPLACE_INTERNAL_HTTP_HOST', 'backend');
    const upstream = vi.fn().mockResolvedValue(Response.json(body, { status, headers: {
      'X-Catalog-Source': 'REAL', 'X-Request-Id': 'g6-demo-request',
    } }));
    vi.stubGlobal('fetch', upstream);
    const result = await GET(new NextRequest(`http://localhost/api/catalog/${path}`, {
      headers: { Authorization: 'Bearer visitor-token', Cookie: 'private=session' },
    }), { params: Promise.resolve({ path: [path] }) });
    expect(result.status).toBe(status);
    expect(result.headers.get('x-catalog-source')).toBe('REAL');
    expect(result.headers.get('x-request-id')).toBe('g6-demo-request');
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(await result.json()).toEqual(body);
    const forwarded = new Headers(upstream.mock.calls[0][1].headers);
    expect(forwarded.has('Authorization')).toBe(false);
    expect(forwarded.has('Cookie')).toBe(false);
  });
});

describe('APIM boundary and trace correlation (FE #140)', () => {
  const TRACE = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

  it.each(['/v1', '/api/v1', '/marketplace/g1/v1'])(
    'forwards to the published prefix %s without duplicating /api/v1',
    async (basePath) => {
      vi.stubEnv('MARKETPLACE_API_URL', 'https://apim.example.com');
      vi.stubEnv('MARKETPLACE_API_BASE_PATH', basePath);
      const upstream = vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: [] }, { headers: { 'X-Catalog-Source': 'REAL' } }),
        );
      vi.stubGlobal('fetch', upstream);

      await GET(
        new NextRequest('http://localhost/api/catalog/products/nike-academy?page=2'),
        { params: Promise.resolve({ path: ['products', 'nike-academy'] }) },
      );

      expect(String(upstream.mock.calls[0][0])).toBe(
        `https://apim.example.com${basePath}/catalog/products/nike-academy?page=2`,
      );
      expect(String(upstream.mock.calls[0][0])).not.toContain('/api/v1/api/v1');
    },
  );

  it('keeps the default /api/v1 when the variable is not configured', async () => {
    vi.stubEnv('MARKETPLACE_API_URL', 'http://backend:10000');
    vi.stubEnv('MARKETPLACE_INTERNAL_HTTP_HOST', 'backend');
    vi.stubEnv('MARKETPLACE_API_BASE_PATH', '');
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    vi.stubGlobal('fetch', upstream);

    await GET(new NextRequest('http://localhost/api/catalog/home'), {
      params: Promise.resolve({ path: ['home'] }),
    });

    expect(String(upstream.mock.calls[0][0])).toBe(
      'http://backend:10000/api/v1/catalog/home',
    );
  });

  it('rejects an unsafe published prefix with a correlated problem and no upstream call', async () => {
    vi.stubEnv('MARKETPLACE_API_URL', 'https://apim.example.com');
    vi.stubEnv('MARKETPLACE_API_BASE_PATH', '/api/v1/../admin');
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    const response = await GET(
      new NextRequest('http://localhost/api/catalog/home', {
        headers: { 'X-Request-Id': 'apim-prefix-01', traceparent: TRACE },
      }),
      { params: Promise.resolve({ path: ['home'] }) },
    );

    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      code: 'CATALOG_UNAVAILABLE',
      requestId: 'apim-prefix-01',
    });
    expect(response.headers.get('traceparent')).toBe(TRACE);
  });

  it('propagates a valid W3C traceparent to the BFF and back to the browser', async () => {
    vi.stubEnv('MARKETPLACE_API_URL', 'https://apim.example.com');
    vi.stubEnv('MARKETPLACE_API_BASE_PATH', '/v1');
    const upstream = vi.fn().mockResolvedValue(
      Response.json({ data: [] }, { headers: { 'X-Catalog-Source': 'REAL' } }),
    );
    vi.stubGlobal('fetch', upstream);

    const response = await GET(
      new NextRequest('http://localhost/api/catalog/home', {
        headers: { traceparent: TRACE },
      }),
      { params: Promise.resolve({ path: ['home'] }) },
    );

    expect(upstream.mock.calls[0][1].headers.traceparent).toBe(TRACE);
    expect(response.headers.get('traceparent')).toBe(TRACE);
  });

  it('generates a well-formed traceparent when the incoming one is invalid or missing', async () => {
    vi.stubEnv('MARKETPLACE_API_URL', 'https://apim.example.com');
    vi.stubEnv('MARKETPLACE_API_BASE_PATH', '/v1');
    const upstream = vi.fn().mockResolvedValue(
      Response.json({ data: [] }, { headers: { 'X-Catalog-Source': 'REAL' } }),
    );
    vi.stubGlobal('fetch', upstream);

    const response = await GET(
      new NextRequest('http://localhost/api/catalog/home', {
        headers: { traceparent: 'not-a-traceparent' },
      }),
      { params: Promise.resolve({ path: ['home'] }) },
    );

    const generated = upstream.mock.calls[0][1].headers.traceparent;
    expect(generated).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/u);
    expect(generated).not.toBe('not-a-traceparent');
    expect(response.headers.get('traceparent')).toBe(generated);
  });

  it('does not expose the upstream host or credentials in the response', async () => {
    vi.stubEnv('MARKETPLACE_API_URL', 'https://apim.example.com');
    vi.stubEnv('MARKETPLACE_API_BASE_PATH', '/v1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ data: [] }, { headers: { 'X-Catalog-Source': 'REAL' } }),
      ),
    );

    const response = await GET(new NextRequest('http://localhost/api/catalog/home'), {
      params: Promise.resolve({ path: ['home'] }),
    });

    const serialized = JSON.stringify([...response.headers]);
    expect(serialized).not.toContain('apim.example.com');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

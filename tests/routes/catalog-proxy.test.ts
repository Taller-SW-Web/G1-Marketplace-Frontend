// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/catalog/[...path]/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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

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
      const response = await GET(new NextRequest("http://localhost/api/catalog/products?q=running"), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(200);
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
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/cart/[...path]/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Cart proxy with the integrated baseline", () => {
  it("forwards anonymous requests in production without issuing mock credentials", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MARKETPLACE_API_URL", "https://marketplace.example");
    vi.stubEnv("MOCK_AUTH_URL", "https://mock-auth.invalid");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { items: [] } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("https://web.example/api/cart/current"), {
      params: Promise.resolve({ path: ["current"] }),
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://marketplace.example/api/v1/carts/current");
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBeNull();
  });

  it("reports BFF unavailability without falling back to a default mock identity", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CHECKOUT_MODE", "backend-mock");
    vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10000");
    const fetchMock = vi.fn().mockRejectedValue(new Error("backend unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/cart/current"), {
      params: Promise.resolve({ path: ["current"] }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "CART_BACKEND_UNAVAILABLE" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://127.0.0.1:10000/api/v1/carts/current");
  });
});

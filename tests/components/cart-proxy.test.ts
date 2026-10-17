import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/cart/[...path]/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Cart server-side proxy guard", () => {
  it("does not issue mock credentials in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/cart/current") as never, {
      params: Promise.resolve({ path: ["current"] }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "CART_BACKEND_MODE_DISABLED" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the shared mock identity when Checkout backend-mock mode is enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CHECKOUT_MODE", "backend-mock");
    const fetchMock = vi.fn().mockRejectedValue(new Error("mock issuer unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/cart/current") as never, {
      params: Promise.resolve({ path: ["current"] }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "CART_AUTH_UNAVAILABLE" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

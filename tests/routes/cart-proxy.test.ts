// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../src/app/api/cart/[...path]/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("cart proxy with the shared Backend", () => {
  it("uses an anonymous cart in production and never requests a default mock identity", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MARKETPLACE_API_URL", "https://marketplace.example");
    vi.stubEnv("MOCK_AUTH_URL", "https://mock-auth.invalid");
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: { items: [] } }, {
      headers: { "Set-Cookie": "cart_session=anonymous; Path=/; HttpOnly; SameSite=Lax" },
    }));
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new NextRequest("https://web.example/api/cart/current", {
      headers: { Cookie: "cart_session=anonymous" },
    }), { params: Promise.resolve({ path: ["current"] }) });
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, options] = upstream.mock.calls[0];
    expect(String(url)).toBe("https://marketplace.example/api/v1/carts/current");
    expect(options.headers.get("Authorization")).toBeNull();
    expect(options.headers.get("Cookie")).toBe("cart_session=anonymous");
    expect(response.headers.get("Set-Cookie")).toContain("cart_session=anonymous;");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("forwards explicit authentication without replacing it or retrying anonymously", async () => {
    vi.stubEnv("MARKETPLACE_API_URL", "https://marketplace.example");
    const upstream = vi.fn().mockResolvedValue(Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }));
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new NextRequest("https://web.example/api/cart/current", {
      headers: { Authorization: "Bearer caller-provided-test-value" },
    }), { params: Promise.resolve({ path: ["current"] }) });
    expect(response.status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer caller-provided-test-value");
  });

  it("preserves POST payloads and maps the items alias to the shared cart endpoint", async () => {
    vi.stubEnv("MARKETPLACE_API_URL", "https://marketplace.example");
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: { items: [] } }, { status: 201 }));
    vi.stubGlobal("fetch", upstream);
    const body = JSON.stringify({ sku: "fixture-sku", quantity: 1 });
    const response = await POST(new NextRequest("https://web.example/api/cart/items", {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
    }), { params: Promise.resolve({ path: ["items"] }) });
    expect(response.status).toBe(201);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(String(upstream.mock.calls[0][0])).toBe("https://marketplace.example/api/v1/carts/current/items");
    expect(upstream.mock.calls[0][1].body).toBe(body);
  });

  it("rejects arbitrary proxy paths before contacting any service", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new NextRequest("https://web.example/api/cart/admin"), {
      params: Promise.resolve({ path: ["admin"] }),
    });
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/wishlist/items/[productId]/add-to-cart/route";
import { wishlistCartEnabled } from "../../src/features/wishlist/add-server";
import { mutateWishlist } from "../../src/features/wishlist/server";
import { readWishlist } from "../../src/features/wishlist/list-server";
import { GET as readCart } from "../../src/app/api/cart/[...path]/route";

const origin = "https://shop.fixture.test";
const backend = "https://bff.fixture.test";
const cookieA = `__Host-g1_session=${"a".repeat(43)}`;
const cookieB = `__Host-g1_session=${"b".repeat(43)}`;
const snapshot = { productId: "PRD-1", cart: { cartId: "cart-A", version: 2, items: [{ sku: "SKU-1", quantity: 1 }] } };
const context = { params: Promise.resolve({ productId: "PRD-1" }) };
function request(cookie = cookieA, headers: Record<string, string> = {}, body?: string, search = "") {
  return new NextRequest(`${origin}/api/wishlist/items/PRD-1/add-to-cart${search}`, {
    method: "POST", headers: { origin, cookie, ...headers }, ...(body === undefined ? {} : { body }),
  });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("G1_AUTH_ENABLED", "true");
  vi.stubEnv("G1_WEB_ORIGIN", origin); vi.stubEnv("MARKETPLACE_API_URL", backend);
  vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "false"); vi.stubEnv("H3_WISHLIST_CART_ENABLED", "true");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("F-039 authenticated BFF contract (controlled provider)", () => {
  it("requires explicit cart opt-in even when web authentication is enabled", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("H3_WISHLIST_CART_ENABLED", "false");
    expect(wishlistCartEnabled()).toBe(false);
    expect((await POST(request(), context)).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards the opaque web session once in production, with no sandbox token or body", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ...snapshot, token: "private" }));
    vi.stubGlobal("fetch", fetcher); vi.stubEnv("H3_SANDBOX_TOKEN_A", "must-not-be-used");
    expect(wishlistCartEnabled()).toBe(true);
    const response = await POST(request(`${cookieA}; unrelated=private; h3-session=old-demo`), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual(snapshot);
    expect(response.headers.get("cache-control")).toContain("no-store, private");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe(`${backend}/api/v1/wishlist/items/PRD-1/add-to-cart`);
    expect(options).toMatchObject({ method: "POST", cache: "no-store", redirect: "error",
      headers: { Cookie: cookieA, Origin: origin } });
    expect(options.headers.Authorization).toBeUndefined(); expect(options.body).toBeUndefined();
  });
  it("never falls back to sandbox when both auth modes are configured", async () => {
    vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "true");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(wishlistCartEnabled()).toBe(false);
    expect((await POST(request(), context)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [{ origin: "https://evil.fixture.test" }, undefined, "", 403],
    [{ "sec-fetch-site": "cross-site" }, undefined, "", 403],
    [{ authorization: "Bearer browser-selected-owner" }, undefined, "", 400],
    [{ "idempotency-key": "unsupported" }, undefined, "", 400],
    [{}, '{"customerId":"other"}', "", 400],
    [{}, undefined, "?customerId=other", 400],
  ] as const)("rejects browser overrides before contacting the BFF: %j", async (headers, body, query, status) => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await POST(request(cookieA, headers, body, query), context)).status).toBe(status);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("propagates expired or missing sessions as 401 without forwarding private error data", async () => {
    const fetcher = vi.fn().mockImplementation(async () => Response.json({ code: "UNAUTHORIZED", token: "private" }, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    for (const cookie of [cookieA, ""]) {
      const response = await POST(request(cookie), context);
      expect(response.status).toBe(401); expect(await response.json()).toMatchObject({ code: "UNAUTHORIZED" });
      expect(response.headers.get("cache-control")).toContain("private");
    }
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(["/productos/variante-segura", "https://evil.fixture.test", "/productos/../login"])(
    "keeps only contractual variant redirects: %s", async redirectUrl => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "VARIANT_SELECTION_REQUIRED", redirectUrl }, { status: 422 })));
      const response = await POST(request(), context);
      expect(response.status).toBe(422);
      expect((await response.json()).redirectUrl).toBe(redirectUrl === "/productos/variante-segura" ? redirectUrl : undefined);
    });
  it.each(["timeout", "malformed"])("does not retry an uncertain mutation: %s", async failure => {
    const fetcher = failure === "timeout" ? vi.fn().mockRejectedValue(new Error("private failure"))
      : vi.fn().mockResolvedValue(Response.json({ productId: "other", cart: snapshot.cart }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request(), context);
    expect([502, 504]).toContain(response.status);
    expect(await response.json()).toMatchObject({ code: "CART_RESULT_UNCERTAIN" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("hands off the same A/B web session to save, list, add and the ordinary cart without deleting the favorite", async () => {
    const requests: { path: string; owner: string; method: string }[] = [];
    const favorites = new Set<string>(); const quantities = new Map<string, number>();
    const fetcher = vi.fn(async (url: URL | string, options: RequestInit) => {
      const headers = new Headers(options.headers); const cookie = headers.get("cookie");
      const owner = cookie === cookieA ? "A" : cookie === cookieB ? "B" : "guest";
      const path = new URL(url).pathname; const method = options.method ?? "GET";
      requests.push({ path, owner, method });
      if (owner === "guest") return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
      if (path.endsWith("/wishlist/items")) {
        favorites.add(owner); return Response.json({ productId: "PRD-1" }, { status: 201 });
      }
      if (path.endsWith("/wishlist")) return Response.json(favorites.has(owner) ? [{ productId: "PRD-1",
        createdAt: "2026-11-01T12:00:00.000Z", name: "Producto", slug: "producto", brand: null, image: null,
        price: null, availability: "AVAILABLE" }] : []);
      if (path.endsWith("/add-to-cart")) {
        quantities.set(owner, (quantities.get(owner) ?? 0) + 1);
        return Response.json({ ...snapshot, cart: { ...snapshot.cart, cartId: `cart-${owner}` } });
      }
      if (path.endsWith("/carts/current")) return Response.json({ data: { cartId: `cart-${owner}`, quantity: quantities.get(owner) ?? 0 } });
      throw new Error("Unexpected contract path");
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await mutateWishlist(request(cookieA, { "Content-Type": "application/json" }, '{"productId":"PRD-1"}'), "POST")).status).toBe(201);
    const listing = (cookie: string) => readWishlist(new NextRequest(`${origin}/api/wishlist`, { headers: { cookie } }));
    const before = await (await listing(cookieA)).json();
    expect(before).toHaveLength(1); expect((await POST(request(cookieA), context)).status).toBe(200);
    expect(await (await listing(cookieA)).json()).toEqual(before);
    expect(await (await listing(cookieB)).json()).toEqual([]);
    for (const [cookie, owner, quantity] of [[cookieA, "A", 1], [cookieB, "B", 0]] as const) {
      const cart = await readCart(new NextRequest(`${origin}/api/cart/current`, { headers: { cookie } }),
        { params: Promise.resolve({ path: ["current"] }) });
      expect(await cart.json()).toEqual({ data: { cartId: `cart-${owner}`, quantity } });
    }
    expect(requests.some(r => r.method === "DELETE")).toBe(false);
    expect(requests.find(r => r.path.endsWith("/add-to-cart"))?.owner).toBe("A");
  });
});

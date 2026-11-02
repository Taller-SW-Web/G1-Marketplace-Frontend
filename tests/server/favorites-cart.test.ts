import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { changeSession, readSession, mutateWishlist } from "../../src/features/wishlist/server";
import { addFavoriteToCart } from "../../src/features/wishlist/add-server";
import { readWishlist } from "../../src/features/wishlist/list-server";
import { parseCartAddition } from "../../src/features/wishlist/cart-contract";
const origin = "http://127.0.0.1:3200";
const result = { productId: "PRD-1", cart: { cartId: "cart-A", version: 2, items: [{ sku: "SKU-SIMPLE", quantity: 1 }] } };
function request(cookie = "", extra: Record<string, string> = {}, body?: string) {
  return new NextRequest(`${origin}/api/wishlist/items/PRD-1/add-to-cart`, {
    method: "POST", headers: { origin, cookie, ...extra }, ...(body ? { body } : {}),
  });
}
async function login() {
  const response = await changeSession(new NextRequest(`${origin}/api/h3/session`, { method: "POST",
    headers: { origin, "Content-Type": "application/json" }, body: '{"identity":"A"}' }));
  return response.headers.get("set-cookie")!.split(";")[0];
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "true");
  vi.stubEnv("H3_WISHLIST_CART_ENABLED", "true"); vi.stubEnv("H3_FRONTEND_ORIGIN", origin);
  vi.stubEnv("H3_SANDBOX_TOKEN_A", "private-A"); vi.stubEnv("H3_WISHLIST_READ_ENABLED", "true");
  vi.stubEnv("MARKETPLACE_API_URL", "http://backend:10000"); vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "backend");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("favorites cart proxy", () => {
  it("is disabled by default, rejects guests and keeps production closed", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("H3_WISHLIST_CART_ENABLED", "");
    expect((await addFavoriteToCart(request(), "PRD-1")).status).toBe(404);
    vi.stubEnv("H3_WISHLIST_CART_ENABLED", "true");
    expect((await addFavoriteToCart(request(), "PRD-1")).status).toBe(401);
    vi.stubEnv("NODE_ENV", "production");
    expect((await addFavoriteToCart(request(), "PRD-1")).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards one bodyless mutation with server identity and strips upstream secrets", async () => {
    const cookie = await login(); const fetch = vi.fn().mockResolvedValue(Response.json({ ...result, token: "secret" })); vi.stubGlobal("fetch", fetch);
    const response = await addFavoriteToCart(request(cookie), "PRD-1");
    expect(await response.json()).toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe("http://backend:10000/api/v1/wishlist/items/PRD-1/add-to-cart");
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { Authorization: "Bearer private-A" }, redirect: "error", cache: "no-store" });
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
    expect(response.headers.get("cache-control")).toContain("private");
  });
  it("rejects injection, request bodies, dot segments and arbitrary upstream hosts", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const headers of ([{ origin: "https://elsewhere.test" }, { authorization: "Bearer injected" }, { "idempotency-key": "unsupported" }] as Record<string, string>[]))
      expect((await addFavoriteToCart(request(cookie, headers), "PRD-1")).status).toBeGreaterThanOrEqual(400);
    expect((await addFavoriteToCart(request(cookie, {}, "{}"), "PRD-1")).status).toBe(400);
    expect((await addFavoriteToCart(request(cookie), "..")).status).toBe(400);
    vi.stubEnv("MARKETPLACE_API_URL", "http://unapproved:10000");
    expect((await addFavoriteToCart(request(cookie), "PRD-1")).status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["/productos/producto-con-variantes", "https://evil.test", "/productos/../login"])("validates variant destination %s", async redirectUrl => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "VARIANT_SELECTION_REQUIRED", redirectUrl }, { status: 422 })));
    const response = await addFavoriteToCart(request(cookie), "PRD-1");
    expect(response.status).toBe(422);
    expect((await response.json()).redirectUrl).toBe(redirectUrl === "/productos/producto-con-variantes" ? redirectUrl : undefined);
  });
  it.each([[409, "STOCK_LIMIT_REACHED"], [409, "CART_CONFLICT"], [503, "COMMERCE_DATA_UNAVAILABLE"], [503, "AUTH_UNAVAILABLE"]])("preserves known error %s %s", async (status, code) => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code }, { status })));
    const response = await addFavoriteToCart(request(cookie), "PRD-1");
    expect(response.status).toBe(status); expect(await response.json()).toMatchObject({ code });
  });
  it("invalidates identity after upstream 401", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "UNAUTHORIZED" }, { status: 401 })));
    expect((await addFavoriteToCart(request(cookie), "PRD-1")).status).toBe(401);
    expect(await (await readSession(request(cookie))).json()).toMatchObject({ identity: null });
  });
  it("treats network failure and invalid snapshots as uncertain without retry", async () => {
    const cookie = await login(); const fetch = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(Response.json({ ...result, productId: "other" })); vi.stubGlobal("fetch", fetch);
    for (let i = 0; i < 2; i++) expect(await (await addFavoriteToCart(request(cookie), "PRD-1")).json()).toMatchObject({ code: "CART_RESULT_UNCERTAIN" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(parseCartAddition({ ...result, cart: { ...result.cart, items: [] } }, "PRD-1")).toBeNull();
  });
});
describe("favorites internal-host configuration", () => {
  it("uses the approved internal host for list and save", async () => {
    const cookie = await login(); const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({ productId: "PRD-1" }, { status: 201 })); vi.stubGlobal("fetch", fetch);
    expect((await readWishlist(new NextRequest(`${origin}/api/wishlist`, { headers: { cookie } }))).status).toBe(200);
    expect((await mutateWishlist(request(cookie, { "Content-Type": "application/json" }, '{"productId":"PRD-1"}'), "POST")).status).toBe(201);
    expect(fetch.mock.calls.map(call => String(call[0]))).toEqual(["http://backend:10000/api/v1/wishlist", "http://backend:10000/api/v1/wishlist/items"]);
  });
  it("rejects an unapproved host for read and save", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("MARKETPLACE_API_URL", "http://unapproved:10000");
    expect((await readWishlist(new NextRequest(`${origin}/api/wishlist`, { headers: { cookie } }))).status).toBe(500);
    expect((await mutateWishlist(request(cookie, { "Content-Type": "application/json" }, '{"productId":"PRD-1"}'), "POST")).status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });
});

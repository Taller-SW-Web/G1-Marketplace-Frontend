import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { changeSession, readSession } from "../../src/features/wishlist/server";
import { readWishlist, moveWishlist } from "../../src/features/wishlist/list-server";
import { parseMove, parseWishlist, safeProductPath } from "../../src/features/wishlist/contract";

const origin = "http://127.0.0.1:3200";
const key = "11111111-1111-4111-8111-111111111111";
const item = { productId: "PRD-1", createdAt: "2026-10-16T12:00:00.000Z", name: "Producto", slug: "producto", brand: null, image: null, price: null, availability: "AVAILABLE" };
const moved = { productId: "PRD-1", cart: { cartId: "cart", version: 1, items: [{ sku: "sku", quantity: 1 }] } };
function request(cookie = "", method = "GET", headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(`${origin}/api/wishlist`, { method, headers: { cookie, origin, ...headers }, ...(body === undefined ? {} : { body }) });
}
async function login() {
  const response = await changeSession(new NextRequest(`${origin}/api/h3/session`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: '{"identity":"A"}' }));
  return response.headers.get("set-cookie")!.split(";")[0];
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "true");
  vi.stubEnv("H3_SANDBOX_TOKEN_A", "private-A"); vi.stubEnv("H3_FRONTEND_ORIGIN", origin);
  vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10200");
  vi.stubEnv("H3_WISHLIST_READ_ENABLED", "true"); vi.stubEnv("H3_WISHLIST_MOVE_ENABLED", "true");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("proposed wishlist contract", () => {
  it("rejects duplicate IDs, missing commercial state, invalid money and unsafe slugs", () => {
    expect(parseWishlist([item])).toEqual([item]); expect(parseWishlist([])).toEqual([]);
    expect(parseWishlist([item, item])).toBeNull();
    for (const change of [{ availability: "UNKNOWN" }, { slug: "../escape" }, { createdAt: "bad" }, { price: { amount: -1, currency: "PEN" } }, { image: { url: "//evil.test/a", alt: "a" } }]) expect(parseWishlist([{ ...item, ...change }])).toBeNull();
    expect(parseWishlist([{ ...item, name: null, slug: null, availability: "UNAVAILABLE" }])).not.toBeNull();
  });
  it("validates cart snapshots and whitelists internal product redirects", () => {
    expect(parseMove(moved, "PRD-1")).toEqual(moved);
    expect(parseMove(moved, "other")).toBeNull();
    expect(parseMove({ ...moved, cart: { ...moved.cart, items: [{ sku: "sku", quantity: 0 }] } }, "PRD-1")).toBeNull();
    expect(safeProductPath("/productos/producto-1")).toBe(true);
    for (const path of ["https://evil.test", "//evil.test", "/productos/../login", "/productos/a?returnTo=https://evil.test", "/productos/a%2fb"]) expect(safeProductPath(path)).toBe(false);
  });
});
describe("wishlist read and atomic-move proxy", () => {
  it("rejects anonymous reads and moves without contacting backend", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await readWishlist(request())).status).toBe(401);
    expect((await moveWishlist(request("", "POST", { "Idempotency-Key": key }), "PRD-1")).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("gates unimplemented endpoints and keeps production sandbox closed", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("H3_WISHLIST_READ_ENABLED", "false"); vi.stubEnv("H3_WISHLIST_MOVE_ENABLED", "false");
    expect((await readWishlist(request(cookie))).status).toBe(503);
    expect((await moveWishlist(request(cookie, "POST", { "Idempotency-Key": key }), "PRD-1")).status).toBe(503);
    vi.stubEnv("NODE_ENV", "production"); expect((await readWishlist(request(cookie))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns only validated projection and keeps tokens in the server", async () => {
    const cookie = await login(); const fetch = vi.fn().mockResolvedValue(Response.json([{ ...item, customerId: "SECRET", token: "SECRET" }])); vi.stubGlobal("fetch", fetch);
    const response = await readWishlist(request(cookie)); expect(await response.json()).toEqual([item]);
    expect(fetch.mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer private-A" }, cache: "no-store", redirect: "error" });
    expect(response.headers.get("cache-control")).toContain("private");
  });
  it("maps missing GET to unavailable and never to an empty list", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));
    const response = await readWishlist(request(cookie)); expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "WISHLIST_UNAVAILABLE" });
  });
  it("forwards the same idempotency key without a second cart request", async () => {
    const cookie = await login(); const fetch = vi.fn().mockResolvedValue(Response.json(moved)); vi.stubGlobal("fetch", fetch);
    const response = await moveWishlist(request(cookie, "POST", { "Idempotency-Key": key }), "PRD-1");
    expect(await response.json()).toEqual(moved); expect(fetch).toHaveBeenCalledOnce();
    expect(String(fetch.mock.calls[0][0])).toBe("http://127.0.0.1:10200/api/v1/wishlist/items/PRD-1/move-to-cart");
    expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(key);
  });
  it("rejects origin, key, identity injection and nonempty body before forwarding", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await moveWishlist(request(cookie, "POST", { origin: "https://evil.test", "Idempotency-Key": key }), "PRD-1")).status).toBe(403);
    expect((await moveWishlist(request(cookie, "POST"), "PRD-1")).status).toBe(400);
    expect((await moveWishlist(request(cookie, "POST", { "Idempotency-Key": key }, '{"customerId":"other"}'), "PRD-1")).status).toBe(400);
    expect((await readWishlist(request(cookie, "GET", { Authorization: "Bearer other" }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects external redirect responses and does not claim a move", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "VARIANT_SELECTION_REQUIRED", redirectUrl: "https://evil.test" }, { status: 422 })));
    const response = await moveWishlist(request(cookie, "POST", { "Idempotency-Key": key }), "PRD-1"); expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("invalidates server session on upstream 401", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await readWishlist(request(cookie))).status).toBe(401);
    expect(await (await readSession(request(cookie))).json()).toMatchObject({ identity: null });
  });
  it("treats a lost move response as uncertain", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const response = await moveWishlist(request(cookie, "POST", { "Idempotency-Key": key }), "PRD-1");
    expect(response.status).toBe(504); expect(await response.json()).toMatchObject({ code: "RESULT_UNCERTAIN" });
  });
});

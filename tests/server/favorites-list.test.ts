import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { changeSession, readSession } from "../../src/features/wishlist/server";
import { readWishlist } from "../../src/features/wishlist/list-server";
import { parseWishlist } from "../../src/features/wishlist/contract";

const origin = "http://127.0.0.1:3200";
const item = { productId: "PRD-1", createdAt: "2026-10-16T12:00:00.000Z", name: "Producto", slug: "producto", brand: null, image: null, price: null, availability: "AVAILABLE" };
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
  vi.stubEnv("H3_WISHLIST_READ_ENABLED", "true");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("proposed wishlist read contract", () => {
  it("rejects duplicate IDs, missing commercial state, invalid money and unsafe slugs", () => {
    expect(parseWishlist([item])).toEqual([item]); expect(parseWishlist([])).toEqual([]);
    expect(parseWishlist([item, item])).toBeNull();
    for (const change of [{ availability: "UNKNOWN" }, { slug: "../escape" }, { createdAt: "bad" }, { price: { amount: -1, currency: "PEN" } }, { image: { url: "//evil.test/a", alt: "a" } }]) expect(parseWishlist([{ ...item, ...change }])).toBeNull();
    expect(parseWishlist([{ ...item, name: null, slug: null, availability: "UNAVAILABLE" }])).not.toBeNull();
  });
});
describe("wishlist read proxy", () => {
  it("rejects anonymous reads without contacting backend", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await readWishlist(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("gates the unimplemented read endpoint and keeps production sandbox closed", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("H3_WISHLIST_READ_ENABLED", "false");
    expect((await readWishlist(request(cookie))).status).toBe(503);
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
  it("rejects origin and identity injection before forwarding", async () => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await readWishlist(request(cookie, "GET", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await readWishlist(request(cookie, "GET", { Authorization: "Bearer other" }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("invalidates server session on upstream 401", async () => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await readWishlist(request(cookie))).status).toBe(401);
    expect(await (await readSession(request(cookie))).json()).toMatchObject({ identity: null });
  });
});

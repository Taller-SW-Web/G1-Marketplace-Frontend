import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { changeSession, mutateWishlist, readSession, sandboxEnabled } from "../../src/features/wishlist/server";
import { getItemState, isProductId } from "../../src/features/wishlist/types";
import { POST } from "../../src/app/api/wishlist/items/route";
import { DELETE } from "../../src/app/api/wishlist/items/[productId]/route";

const origin = "http://localhost:3200";
function request(path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}, method = "POST") {
  return new NextRequest(`${origin}${path}`, { method, headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
async function login(identity = "A") {
  const response = await changeSession(request("/api/h3/session", { identity }));
  return response.headers.get("set-cookie")!.split(";")[0];
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "true");
  vi.stubEnv("H3_SANDBOX_TOKEN_A", "private-token-A"); vi.stubEnv("H3_SANDBOX_TOKEN_B", "private-token-B");
  vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10200");
  vi.stubEnv("H3_FRONTEND_ORIGIN", origin);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("session and security boundary", () => {
  it("uses an opaque HttpOnly cookie and returns no credentials", async () => {
    const response = await changeSession(request("/api/h3/session", { identity: "A" }));
    const body = await response.json();
    expect(body).toMatchObject({ identity: "A", enabled: true });
    expect(body.scope).not.toBe("A");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(JSON.stringify(body) + response.headers.get("set-cookie")).not.toContain("private-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("rotates the scope, invalidates the old cookie and supports logout", async () => {
    const cookie = await login();
    const changed = await changeSession(request("/api/h3/session", { identity: "B" }, cookie));
    expect((await readSession(request("/api/h3/session", undefined, cookie)).json()).identity).toBe(null);
    const nextCookie = changed.headers.get("set-cookie")!.split(";")[0];
    expect((await readSession(request("/api/h3/session", undefined, nextCookie)).json()).identity).toBe("B");
    await changeSession(request("/api/h3/session", { identity: null }, nextCookie));
    expect((await readSession(request("/api/h3/session", undefined, nextCookie)).json()).identity).toBe(null);
  });
  it("expires the in-memory session", async () => {
    const cookie = await login(); vi.useFakeTimers(); vi.advanceTimersByTime(900001);
    expect((await readSession(request("/api/h3/session", undefined, cookie)).json()).identity).toBe(null);
  });
  it.each(["production", "staging"])("fails closed in %s even with the flag", async environment => {
    vi.stubEnv("NODE_ENV", environment); expect(sandboxEnabled()).toBe(false);
    expect((await changeSession(request("/api/h3/session", { identity: "A" }))).status).toBe(404);
    expect((await POST(request("/api/wishlist/items", { productId: "PRD-1" }))).status).toBe(404);
  });
  it.each(["https://evil.test", "null", ""])("rejects foreign/missing origin %s", async value => {
    const req = request("/api/h3/session", { identity: "A" }, undefined, { origin: value });
    expect((await changeSession(req)).status).toBe(403);
  });
  it("rejects cross-site fetch metadata and arbitrary Authorization", async () => {
    expect((await changeSession(request("/api/h3/session", { identity: "A" }, undefined, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await changeSession(request("/api/h3/session", { identity: "A" }, undefined, { Authorization: "Bearer attacker" }))).status).toBe(400);
  });
  it("pins the browser origin despite NextURL loopback normalization and spoofed forwarded headers", async () => {
    vi.stubEnv("H3_FRONTEND_ORIGIN", "http://127.0.0.1:3200");
    const req = new NextRequest("http://127.0.0.1:3200/api/h3/session", { method: "POST",
      headers: { origin: "http://127.0.0.1:3200", "content-type": "application/json" }, body: '{"identity":"A"}' });
    expect(req.url).toContain("localhost"); expect((await changeSession(req)).status).toBe(200);
    expect((await changeSession(request("/api/h3/session", { identity: "A" }, undefined,
      { origin: "http://evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "http" }))).status).toBe(403);
  });
  it.each([{ identity: "C" }, { identity: "A", customerId: "foreign" }, null])("rejects invalid session payload %j", async body => {
    expect((await changeSession(request("/api/h3/session", body))).status).toBe(400);
  });
});

describe("wishlist proxy", () => {
  it("rejects unauthenticated calls without reaching Nest", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await POST(request("/api/wishlist/items", { productId: "PRD-1" }))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([200, 201])("preserves %s, validates success and uses server identity", async status => {
    const cookie = await login();
    const fetch = vi.fn().mockResolvedValue(Response.json({ productId: "PRD-1" }, { status })); vi.stubGlobal("fetch", fetch);
    const response = await POST(request("/api/wishlist/items", { productId: "PRD-1" }, cookie));
    expect(response.status).toBe(status); expect(await response.json()).toEqual({ productId: "PRD-1" });
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:10200/api/v1/wishlist/items");
    expect(options).toMatchObject({ cache: "no-store", redirect: "error", headers: { Authorization: "Bearer private-token-A" }, body: '{"productId":"PRD-1"}' });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("handles DELETE 204 without parsing JSON and encodes the product segment", async () => {
    const cookie = await login("B"); const json = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ status: 204, json }); vi.stubGlobal("fetch", fetch);
    const response = await DELETE(request("/api/wishlist/items/x", undefined, cookie, {}, "DELETE"), { params: Promise.resolve({ productId: "a/b?#é" }) });
    expect(response.status).toBe(204); expect(await response.text()).toBe(""); expect(json).not.toHaveBeenCalled();
    expect(String(fetch.mock.calls[0][0])).toContain("/a%2Fb%3F%23%C3%A9");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer private-token-B");
  });
  it.each([{ productId: "PRD-1", customerId: "foreign" }, { productId: " PRD-1" }, { productId: "x\u0000" }, { productId: "" }, { productId: 1 }])("rejects invalid body %j before transport", async body => {
    const cookie = await login(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await POST(request("/api/wishlist/items", body, cookie))).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[400, "INVALID_PRODUCT_ID"], [401, "UNAUTHORIZED"], [404, "PRODUCT_NOT_AVAILABLE"], [503, "CATALOG_UNAVAILABLE"], [500, "INTERNAL_ERROR"]])("sanitizes %s %s", async (status, code) => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code, message: "secret stack trace" }, { status: Number(status) })));
    const response = await POST(request("/api/wishlist/items", { productId: "PRD-1" }, cookie));
    expect(response.status).toBe(status); const body = await response.json(); expect(body.code).toBe(code); expect(body.message).not.toContain("secret");
    if (status === 401) expect((await readSession(request("/api/h3/session", undefined, cookie)).json()).identity).toBe(null);
  });
  it.each([Response.json({ productId: "other" }), new Response("<html>private error</html>", { status: 502 }), Response.json({}, { status: 302 })])("does not confirm malformed responses", async upstream => {
    const cookie = await login(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));
    const response = await POST(request("/api/wishlist/items", { productId: "PRD-1" }, cookie));
    expect((await response.json()).code).toBe("RESULT_UNCERTAIN");
  });
  it("reports timeout as uncertain and imposes an 8s abort deadline", async () => {
    const cookie = await login(); vi.useFakeTimers();
    // Real AbortSignal.timeout timers are independent of Vitest's fake clock.
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("private", "TimeoutError")));
    const response = await POST(request("/api/wishlist/items", { productId: "PRD-1" }, cookie));
    expect(timeout).toHaveBeenCalledWith(8000); expect(response.status).toBe(504);
    expect((await response.json()).code).toBe("RESULT_UNCERTAIN"); timeout.mockRestore();
  });
  it("rejects malformed JSON, DELETE bodies and unsafe provider bases", async () => {
    const cookie = await login();
    const bad = new NextRequest(`${origin}/api/wishlist/items`, { method: "POST", headers: { origin, cookie }, body: "{" });
    expect((await POST(bad)).status).toBe(400);
    expect((await mutateWishlist(request("/api/wishlist/items/x", { customerId: "foreign" }, cookie, {}, "DELETE"), "DELETE", "x")).status).toBe(400);
    vi.stubEnv("MARKETPLACE_API_URL", "http://evil.test"); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await POST(request("/api/wishlist/items", { productId: "PRD-1" }, cookie))).status).toBe(500); expect(fetch).not.toHaveBeenCalled();
  });
  it("uses Unicode character lengths without normalizing ids", () => {
    expect(isProductId("😀".repeat(100))).toBe(true); expect(isProductId("😀".repeat(101))).toBe(false);
    expect(isProductId("a B")).toBe(true); expect(isProductId(" x")).toBe(false);
  });
  it("does not mistake inherited object keys for a confirmed product state", () => {
    for (const id of ["__proto__", "constructor", "toString"]) {
      expect(isProductId(id)).toBe(true);
      expect(getItemState({}, id)).toEqual({ confirmed: "unknown" });
      expect(getItemState({ [id]: { confirmed: "saved" } }, id)).toEqual({ confirmed: "saved" });
    }
  });
});

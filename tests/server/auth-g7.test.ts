import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { proxyAuth } from "../../src/features/auth/server";
import { readWishlist } from "../../src/features/wishlist/list-server";
import { mutateWishlist } from "../../src/features/wishlist/server";
import { NextRequest } from "next/server";
import { safeReturn } from "../../src/features/auth/client";

const origin = "http://127.0.0.1:3000";
const opaque = "s".repeat(43);
const user = { id: "11111111-1111-4111-8111-111111111111", nombreCompleto: "Cuenta fixture", roles: ["CLIENTE"] };
const session = { authenticated: true, scope: "fixture-scope", user };
function req(action: string, body?: unknown, options: Record<string, string> = {}) {
  return new Request(`${origin}/api/v1/auth/${action}`, { method: body !== undefined ? "POST" : "GET",
    headers: { Origin: origin, "Content-Type": "application/json", Cookie: `g1_session=${opaque}; unrelated=private`, ...options },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("G1_AUTH_ENABLED", "true");
  vi.stubEnv("G1_WEB_ORIGIN", origin); vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "false");
  vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10000");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("G7 BFF web boundary", () => {
  it("whitelists the public response and forwards only opaque G1 cookies", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ...session, accessToken: "must-never-reach-browser", refreshToken: "secret" }, {
      headers: { "Set-Cookie": `g1_session=${opaque}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` },
    })); vi.stubGlobal("fetch", fetcher);
    const response = await proxyAuth(req("login", { correo: "a@fixture.test", contrasena: "fixture" }), "login");
    expect(await response.json()).toEqual(session);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const options = fetcher.mock.calls[0][1];
    expect(options.headers.Cookie).toBe(`g1_session=${opaque}`); expect(options.headers.Authorization).toBeUndefined();
    expect(options.redirect).toBe("error");
  });
  it("never returns the provider challenge or bearer credentials during MFA", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ mfaRequerido: true, canal: "EMAIL", expiraEn: 300,
      challengeToken: "secret-challenge", accessToken: "secret" })));
    const response = await proxyAuth(req("login", { correo: "a@fixture.test", contrasena: "fixture" }), "login");
    expect(await response.json()).toEqual({ mfaRequerido: true, canal: "EMAIL", expiraEn: 300 });
  });
  it.each(["", "null", "https://evil.test"])("rejects unsafe mutation origin %s before contacting BFF", async value => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await proxyAuth(req("logout", {}, { Origin: value }), "logout")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects client refresh tokens, OTP secrets and arbitrary bearer headers", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await proxyAuth(req("refresh", { refreshToken: "injected" }), "refresh")).status).toBe(400);
    expect((await proxyAuth(req("otp/verificar", { codigo: "123456", challengeToken: "injected" }), "otp/verificar")).status).toBe(400);
    expect((await proxyAuth(req("session", undefined, { Authorization: "Bearer injected" }), "session")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("redacts provider errors and preserves public rate-limit/MFA statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "CODIGO_INVALIDO", detail: "private-data" }, { status: 401 })));
    const response = await proxyAuth(req("otp/verificar", { codigo: "999999" }), "otp/verificar");
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ code: "CODIGO_INVALIDO" });
  });
  it("reports local logout separately from remote revocation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ authenticated: false, remoteRevocationPending: true, refreshToken: "secret" }, { headers: { "Set-Cookie": "g1_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } })));
    const response = await proxyAuth(req("logout", {}), "logout");
    expect(await response.json()).toEqual({ authenticated: false, remoteRevocationPending: true });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("does not forward an arbitrary upstream cookie or a non-customer session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...session, user: { ...user, roles: ["VENDEDOR"] } }, {
      headers: { "Set-Cookie": "unrelated=secret; Path=/; HttpOnly" },
    })));
    const response = await proxyAuth(req("session"), "session"); expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("fails closed on unavailable BFF and incompatible real/sandbox flags", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("private failure detail")); vi.stubGlobal("fetch", fetcher);
    const response = await proxyAuth(req("session"), "session");
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ code: "AUTH_UNAVAILABLE" });
    vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "true"); fetcher.mockClear();
    expect((await proxyAuth(req("session"), "session")).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends wishlist reads and mutations through the opaque cookie, without selecting an identity", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await readWishlist(new NextRequest(`${origin}/api/wishlist`, { headers: { Cookie: `g1_session=${opaque}` } }))).status).toBe(200);
    expect((await mutateWishlist(new NextRequest(`${origin}/api/wishlist/items/PRD-1`, { method: "DELETE", headers: { Cookie: `g1_session=${opaque}`, Origin: origin } }), "DELETE", "PRD-1")).status).toBe(204);
    expect(fetcher.mock.calls.every(([, options]) => options.headers.Cookie === `g1_session=${opaque}` && !options.headers.Authorization)).toBe(true);
  });
});
describe("safe login return", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/api/auth", "/login?returnTo=/login", "/\nevil", null])("rejects %s", value => {
    expect(safeReturn(value)).toBe("/");
  });
  it("retains a local shopping destination", () => expect(safeReturn("/favoritos?origen=login")).toBe("/favoritos?origen=login"));
});

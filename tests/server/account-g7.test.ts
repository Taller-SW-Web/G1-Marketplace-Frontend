import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyAccount } from "../../src/features/auth/account-server";

const origin = "http://127.0.0.1:3000";
const draft = { correo: "new@fixture.test", contrasena: "Only-fixture!123", nombres: "Cuenta", apellidos: "Local", celular: "+51900000000", aceptaTerminos: true };
function req(action: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/v1/${action}`, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("G1_AUTH_ENABLED", "true"); vi.stubEnv("H3_FRONTEND_SANDBOX_ENABLED", "false");
  vi.stubEnv("G1_WEB_ORIGIN", origin); vi.stubEnv("MARKETPLACE_API_URL", "http://127.0.0.1:10000");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("account BFF proxy contract", () => {
  it("returns pending verification only and never forwards token/session cookies from registration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: "11111111-1111-4111-8111-111111111111", estado: "PENDIENTE_VERIFICACION", accessToken: "secret" },
      { status: 201, headers: { "Set-Cookie": "wrong=secret; HttpOnly" } })));
    const response = await proxyAccount(req("auth/registro", draft), "auth/registro");
    expect(response.status).toBe(201); expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ id: "11111111-1111-4111-8111-111111111111", estado: "PENDIENTE_VERIFICACION" });
  });
  it.each([{ canalOrigen: "CHATBOT" }, { returnUrl: "https://evil.test" }, { confirmacion: "secret" }])("rejects client field injection %j", async extra => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await proxyAccount(req("auth/registro", { ...draft, ...extra }), "auth/registro")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves uniform recovery acceptance and no reset body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 202 })).mockResolvedValueOnce(new Response(null, { status: 204 })));
    const accepted = await proxyAccount(req("password/recuperar", { correo: "unknown@fixture.test" }), "password/recuperar");
    expect(accepted.status).toBe(202); expect(await accepted.json()).toEqual({ accepted: true });
    const reset = await proxyAccount(req("password/restablecer", { token: "opaque-fixture", nuevaContrasena: "Only-fixture!123" }), "password/restablecer");
    expect(reset.status).toBe(204); expect(await reset.text()).toBe("");
  });
  it.each([[409, "CORREO_NO_DISPONIBLE"], [422, "POLITICA_INCUMPLIDA"], [429, "DEMASIADAS_SOLICITUDES"], [410, "TOKEN_RECUPERACION_EXPIRADO"]])("sanitizes account error %s", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code, detail: "private-provider-detail" }, { status: status as number })));
    const response = await proxyAccount(req("auth/registro", draft), "auth/registro");
    expect(response.status).toBe(status); expect(await response.json()).toEqual({ code });
  });
  it("rejects incompatible policy without substituting defaults", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ longitudMinima: 0 })));
    expect((await proxyAccount(req("password/politica"), "password/politica")).status).toBe(503);
  });
  it("rejects missing/foreign origin and bearer injection before calling BFF", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await proxyAccount(req("auth/registro", draft, { Origin: "https://evil.test" }), "auth/registro")).status).toBe(403);
    expect((await proxyAccount(req("password/recuperar", { correo: "a@fixture.test" }, { Authorization: "Bearer injected" }), "password/recuperar")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails closed when G7 account gates are disabled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "AUTH_OPERATION_UNAVAILABLE" }, { status: 503 })));
    const response = await proxyAccount(req("auth/registro", draft), "auth/registro");
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ code: "AUTH_OPERATION_UNAVAILABLE" });
  });
  it("forwards only bounded retry seconds from a rate-limited response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "DEMASIADAS_SOLICITUDES", retryAfterSeconds: 5, detail: "private" }, { status: 429 })));
    const response = await proxyAccount(req("password/recuperar", { correo: "limit@fixture.test" }), "password/recuperar");
    expect(response.headers.get("retry-after")).toBe("5");
    expect(await response.json()).toEqual({ code: "DEMASIADAS_SOLICITUDES", retryAfterSeconds: 5 });
  });
});

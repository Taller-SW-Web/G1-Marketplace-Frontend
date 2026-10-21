import "server-only";

export const authWebEnabled = () => process.env.G1_AUTH_ENABLED === "true";
const headers = { "Cache-Control": "no-store, private" };
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const failure = (code: string, status: number) => Response.json({ code }, { status, headers });
const cookiePattern = /^(?:__Host-)?g1_(?:session|challenge)=(?:[A-Za-z0-9_-]{43})?(?:;|$)/;

export function webOrigin() {
  const configured = process.env.G1_WEB_ORIGIN ?? (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3000" : "");
  const parsed = new URL(configured);
  if (parsed.origin !== configured || (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production"
    && parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)))) throw new Error("Invalid web origin");
  return configured;
}
export function authRequestGuard(request: Request, mutation: boolean) {
  if (!authWebEnabled()) return failure("AUTH_UNAVAILABLE", 404);
  if (process.env.H3_FRONTEND_SANDBOX_ENABLED === "true") return failure("AUTH_UNAVAILABLE", 503);
  if (request.headers.has("authorization") || new URL(request.url).search) return failure("INVALID_REQUEST", 400);
  if (request.headers.get("sec-fetch-site") === "cross-site") return failure("FORBIDDEN", 403);
  try {
    if (mutation && request.headers.get("origin") !== webOrigin()) return failure("FORBIDDEN", 403);
  } catch { return failure("AUTH_UNAVAILABLE", 503); }
  return null;
}

export async function bffFetch(request: Request, path: string, method: string, body?: unknown) {
  const base = new URL(process.env.MARKETPLACE_API_URL ?? "http://127.0.0.1:10000");
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
    || (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new Error("Invalid BFF origin");
  // Forward only G1 opaque session cookies, never arbitrary browser cookies or bearer tokens.
  const cookies = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim())
    .filter(value => cookiePattern.test(value)).join("; ");
  return fetch(new URL(path, base), { method, cache: "no-store", redirect: "error",
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
    headers: { Accept: "application/json", Origin: webOrigin(), Cookie: cookies,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export function publicSession(value: unknown) {
  if (!object(value) || typeof value.authenticated !== "boolean" || typeof value.scope !== "string") return null;
  if (!value.authenticated) return { authenticated: false, scope: "anonymous" };
  if (!object(value.user) || typeof value.user.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.user.id)
    || typeof value.user.nombreCompleto !== "string" || !Array.isArray(value.user.roles)
    || !value.user.roles.every(role => typeof role === "string") || !value.user.roles.includes("CLIENTE")) return null;
  return { authenticated: true, scope: value.scope, user: { id: value.user.id,
    nombreCompleto: value.user.nombreCompleto.slice(0, 200), roles: value.user.roles } };
}

export async function proxyAuth(request: Request, action: "login" | "session" | "refresh" | "logout" | "otp/solicitar" | "otp/verificar") {
  const mutation = action !== "session";
  const rejected = authRequestGuard(request, mutation);
  if (rejected) return rejected;
  let input: unknown;
  if (mutation) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return failure("INVALID_REQUEST", 415);
    let raw: string;
    try { raw = await request.text(); } catch { return failure("INVALID_REQUEST", 400); }
    if (raw.length > 2048) return failure("INVALID_REQUEST", 413);
    try { input = JSON.parse(raw); } catch { return failure("INVALID_REQUEST", 400); }
    if (!object(input)) return failure("INVALID_REQUEST", 400);
    const fields = action === "login" ? ["correo", "contrasena"] : action === "otp/verificar" ? ["codigo"] : [];
    const values = input;
    if (Object.keys(values).length !== fields.length || fields.some(field => typeof values[field] !== "string")) return failure("INVALID_REQUEST", 400);
    if (action === "login" && (typeof input.correo !== "string" || input.correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo)
      || typeof input.contrasena !== "string" || !input.contrasena || input.contrasena.length > 256)) return failure("INVALID_REQUEST", 400);
    if (action === "otp/verificar" && (typeof input.codigo !== "string" || !/^\d{6}$/.test(input.codigo))) return failure("INVALID_REQUEST", 400);
  }
  try {
    const upstream = await bffFetch(request, `/api/v1/auth/${action}`, mutation ? "POST" : "GET", input);
    const value: unknown = await upstream.json();
    const outgoing = new Headers(headers);
    for (const cookie of upstream.headers.getSetCookie()) {
      if (cookiePattern.test(cookie) && /; HttpOnly(?:;|$)/i.test(cookie)
        && /; Path=\/(?:;|$)/i.test(cookie) && !/; Domain=/i.test(cookie)) outgoing.append("Set-Cookie", cookie);
    }
    if (!upstream.ok) {
      const allowed = ["CREDENCIALES_INVALIDAS", "PASSWORD_CADUCADA", "CODIGO_INVALIDO", "OTP_INTENTOS_AGOTADOS", "OTP_EXPIRADO", "TOKEN_INVALIDO", "REFRESCO_INVALIDO", "RATE_LIMITED", "UNAUTHORIZED", "FORBIDDEN", "INVALID_REQUEST", "AUTH_UNAVAILABLE"];
      const code = object(value) && typeof value.code === "string" && allowed.includes(value.code) ? value.code : "AUTH_UNAVAILABLE";
      return Response.json({ code }, { status: [400, 401, 403, 410, 429].includes(upstream.status) ? upstream.status : 503, headers: outgoing });
    }
    let result: unknown = publicSession(value);
    if (action === "logout" && object(value) && value.authenticated === false && typeof value.remoteRevocationPending === "boolean") {
      result = { authenticated: false, remoteRevocationPending: value.remoteRevocationPending };
    } else if (action === "login" && object(value) && value.mfaRequerido === true && typeof value.expiraEn === "number") {
      result = { mfaRequerido: true, canal: "EMAIL", expiraEn: value.expiraEn };
    } else if (action === "otp/solicitar" && object(value) && value.canal === "EMAIL" && typeof value.destinoEnmascarado === "string"
      && typeof value.expiraEn === "number" && typeof value.desafioExpiraEn === "number") {
      result = { canal: "EMAIL", destinoEnmascarado: value.destinoEnmascarado, expiraEn: value.expiraEn, desafioExpiraEn: value.desafioExpiraEn };
    }
    if (!result) return failure("AUTH_UNAVAILABLE", 503);
    return Response.json(result, { headers: outgoing });
  } catch { return failure("AUTH_UNAVAILABLE", 503); }
}

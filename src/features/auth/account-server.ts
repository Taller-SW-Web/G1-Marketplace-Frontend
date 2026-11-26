import "server-only";
import { authRequestGuard, bffFetch } from "./server";
import { parsePasswordPolicy } from "./policy";

type Action = "auth/registro" | "auth/capabilities" | "password/politica" | "password/recuperar" | "password/restablecer";
const headers = { "Cache-Control": "no-store, private" };
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (code: string, status: number) => Response.json({ code }, { status, headers });
export async function proxyAccount(request: Request, action: Action) {
  const read = ["auth/capabilities", "password/politica"].includes(action);
  const rejected = authRequestGuard(request, !read); if (rejected) return rejected;
  let input: Record<string, unknown> | undefined;
  if (!read) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("INVALID_REQUEST", 415);
    let raw: string; try { raw = await request.text(); } catch { return fail("INVALID_REQUEST", 400); }
    if (raw.length > 8192) return fail("INVALID_REQUEST", 413);
    let value: unknown; try { value = JSON.parse(raw); } catch { return fail("INVALID_REQUEST", 400); }
    const fields = action === "auth/registro" ? ["correo", "contrasena", "nombres", "apellidos", "celular", "aceptaTerminos"]
      : action === "password/recuperar" ? ["correo"] : ["token", "nuevaContrasena"];
    if (!object(value) || Object.keys(value).length !== fields.length || fields.some(name => !(name in value))) return fail("INVALID_REQUEST", 400);
    input = value;
    if ("correo" in input && (typeof input.correo !== "string" || input.correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo))) return fail("INVALID_REQUEST", 400);
    for (const name of ["contrasena", "nuevaContrasena"]) {
      if (name in input && (typeof input[name] !== "string" || !input[name] || input[name].length > 256)) return fail("INVALID_REQUEST", 400);
    }
    if (action === "auth/registro" && (input.aceptaTerminos !== true || typeof input.nombres !== "string" || !input.nombres.trim() || input.nombres.length > 100
      || typeof input.apellidos !== "string" || !input.apellidos.trim() || input.apellidos.length > 100
      || typeof input.celular !== "string" || !/^\+51[0-9]{9}$/.test(input.celular))) return fail("INVALID_REQUEST", 400);
    if (action === "password/restablecer" && (typeof input.token !== "string" || !input.token || input.token.length > 2048)) return fail("INVALID_REQUEST", 400);
  }
  try {
    const upstream = await bffFetch(request, `/api/v1/${action}`, read ? "GET" : "POST", input);
    if (action === "password/recuperar" && upstream.status === 202) return Response.json({ accepted: true }, { status: 202, headers });
    if (action === "password/restablecer" && upstream.status === 204) return new Response(null, { status: 204, headers });
    const value: unknown = await upstream.json();
    if (!upstream.ok) {
      const codes = ["VALIDACION", "INVALID_REQUEST", "CORREO_NO_DISPONIBLE", "POLITICA_INCUMPLIDA", "DEMASIADAS_SOLICITUDES", "RATE_LIMITED",
        "TOKEN_RECUPERACION_INVALIDO", "TOKEN_RECUPERACION_EXPIRADO", "AUTH_OPERATION_UNAVAILABLE", "AUTH_UNAVAILABLE", "FORBIDDEN"];
      const code = object(value) && typeof value.code === "string" && codes.includes(value.code) ? value.code : upstream.status === 400 ? "VALIDACION" : "AUTH_UNAVAILABLE";
      const seconds = object(value) && typeof value.retryAfterSeconds === "number" && Number.isInteger(value.retryAfterSeconds)
        && value.retryAfterSeconds >= 0 && value.retryAfterSeconds <= 86400 ? value.retryAfterSeconds : undefined;
      return Response.json({ code, ...(seconds !== undefined && upstream.status === 429 ? { retryAfterSeconds: seconds } : {}) }, {
        status: [400, 401, 403, 409, 410, 422, 429].includes(upstream.status) ? upstream.status : 503,
        headers: { ...headers, ...(seconds !== undefined && upstream.status === 429 ? { "Retry-After": String(seconds) } : {}) },
      });
    }
    if (action === "password/politica" && upstream.status === 200) {
      const policy = parsePasswordPolicy(value); if (policy) return Response.json(policy, { headers });
    }
    if (action === "auth/capabilities" && object(value) && ["login", "registro", "recuperacion"].every(name => typeof value[name] === "boolean")) {
      return Response.json({ login: value.login, registro: value.registro, recuperacion: value.recuperacion }, { headers });
    }
    if (action === "auth/registro" && upstream.status === 201 && object(value) && typeof value.id === "string"
      && /^[0-9a-f-]{36}$/i.test(value.id) && value.estado === "PENDIENTE_VERIFICACION") {
      return Response.json({ id: value.id, estado: value.estado }, { status: 201, headers });
    }
    return fail("AUTH_UNAVAILABLE", 503);
  } catch { return fail("AUTH_UNAVAILABLE", 503); }
}

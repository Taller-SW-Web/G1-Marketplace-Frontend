import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
// El BFF puede tardar hasta 30 s en crear el pedido en Ventas y esperar hasta 60 s más para confirmar su estado.
// El proxy no puede esperar tanto (límite de la función): a los 55 s responde 202 con Retry-After y la operación
// original, que el BFF sigue procesando, se consulta después con la misma clave.
export const maxDuration = 60;
const PENDING_TIMEOUT_MS = 55_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const PENDING_RETRY_AFTER_SECONDS = "5";

type RouteContext = { params: Promise<{ path: string[] }> };

function localHttpAllowed(url: URL) {
  return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
}

function configuredUrl(value: string | undefined, fallback: string) {
  const url = new URL(value || fallback);
  if (url.username || url.password || url.search || url.hash) throw new Error("Invalid service URL");
  if (url.protocol !== "https:" && !localHttpAllowed(url)) throw new Error("Insecure service URL");
  return url;
}

function allowedEndpoint(path: string[], method: string) {
  const joined = path.join("/");
  if (joined === "delivery-addresses" && ["GET", "POST"].includes(method)) return joined;
  if (["quotes", "benefits", "preparations", "orders"].includes(joined) && method === "POST") return joined;
  if (/^operations\/[0-9a-f-]{36}$/i.test(joined) && method === "GET") return joined;
  return null;
}

const NO_STORE = { "Cache-Control": "no-store, private" };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function checkoutError(code: string, status: number) {
  return Response.json({ error: { code } }, { status, headers: NO_STORE });
}

/** Reenvía la petición al BFF real con la sesión opaca de la cuenta (nunca un token del navegador). */
async function forwardToBff(request: NextRequest, endpoint: string) {
  const { authRequestGuard, bffFetch } = await import("@/features/auth/server");
  const mutation = request.method !== "GET";
  const blocked = authRequestGuard(request, mutation);
  if (blocked) {
    let code = "CHECKOUT_REQUEST_FAILED";
    try {
      const payload: unknown = await blocked.clone().json();
      if (typeof payload === "object" && payload !== null && "code" in payload && typeof payload.code === "string") code = payload.code;
    } catch { /* se conserva el código genérico */ }
    return checkoutError(code, blocked.status);
  }

  const isPendingEndpoint = endpoint === "orders" || endpoint.startsWith("operations/");
  const extraHeaders: Record<string, string> = {};
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && /^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) extraHeaders["Idempotency-Key"] = idempotencyKey;
  const cartSession = request.cookies.get("cart_session")?.value;
  const extraCookies = cartSession && /^[A-Za-z0-9_-]{16,128}$/.test(cartSession) ? [`cart_session=${cartSession}`] : [];

  let body: unknown;
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) return checkoutError("UNSUPPORTED_CONTENT_TYPE", 415);
    const raw = await request.text();
    if (raw.length > 16_384) return checkoutError("PAYLOAD_TOO_LARGE", 413);
    try { body = JSON.parse(raw); } catch { return checkoutError("INVALID_REQUEST", 400); }
  }

  try {
    const upstream = await bffFetch(request, `/api/v1/checkout/${endpoint}`, request.method, body, { headers: extraHeaders, cookies: extraCookies,
      timeoutMs: isPendingEndpoint ? PENDING_TIMEOUT_MS : DEFAULT_TIMEOUT_MS });
    const text = await upstream.text();
    try { JSON.parse(text); } catch { return checkoutError("INVALID_BACKEND_RESPONSE", 502); }
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", ...NO_STORE });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter && /^\d{1,5}$/.test(retryAfter)) headers.set("Retry-After", retryAfter);
    return new Response(text, { status: upstream.status, headers });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut && isPendingEndpoint) {
      const operationId = endpoint.startsWith("operations/")
        ? endpoint.slice("operations/".length)
        : isRecord(body) && typeof body.checkoutOperationId === "string" ? body.checkoutOperationId : undefined;
      if (operationId && /^[0-9a-f-]{36}$/i.test(operationId)) {
        // Resultado todavía incierto: no es un error ni un pago confirmado.
        return Response.json({ data: { checkoutOperationId: operationId, state: "SUBMITTED" } }, {
          status: 202, headers: { ...NO_STORE, "Retry-After": PENDING_RETRY_AFTER_SECONDS },
        });
      }
    }
    return checkoutError("CHECKOUT_BACKEND_UNAVAILABLE", 503);
  }
}

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = allowedEndpoint(path, request.method);
  if (!endpoint) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  // El modo real exige las dos variables (servidor y compilación): una configuración parcial no llama al BFF.
  const serverBff = process.env.CHECKOUT_MODE === "bff";
  const publicBff = process.env.NEXT_PUBLIC_CHECKOUT_MODE === "bff";
  if (serverBff || publicBff) {
    return serverBff && publicBff ? forwardToBff(request, endpoint) : checkoutError("CHECKOUT_MODE_MISCONFIGURED", 503);
  }
  const isBackendMock =
    process.env.CHECKOUT_MODE === "backend-mock" ||
    process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock";
  if (!isBackendMock) {
    return Response.json({ error: { code: "CHECKOUT_BACKEND_MODE_DISABLED" } }, { status: 503 });
  }

  try {
    const api = configuredUrl(process.env.MARKETPLACE_API_URL, "http://127.0.0.1:10000");
    const auth = configuredUrl(process.env.MOCK_AUTH_URL, "http://127.0.0.1:4010");
    if (!localHttpAllowed(api) || !localHttpAllowed(auth) || process.env.NODE_ENV === "production") {
      throw new Error("Backend mock mode is local-development only");
    }

    const tokenResponse = await fetch(new URL("/token?user=default", auth), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) throw new Error("Mock identity unavailable");
    const tokenPayload: unknown = await tokenResponse.json();
    if (typeof tokenPayload !== "object" || tokenPayload === null || !("access_token" in tokenPayload) || typeof tokenPayload.access_token !== "string") {
      throw new Error("Invalid mock identity response");
    }

    const url = new URL(`/api/v1/checkout/${endpoint}`, api);
    const headers = new Headers({ Accept: "application/json", Authorization: `Bearer ${tokenPayload.access_token}` });
    const cartSession = request.cookies.get("cart_session")?.value;
    if (cartSession && /^[A-Za-z0-9_-]{16,128}$/.test(cartSession)) {
      headers.set("Cookie", `cart_session=${cartSession}`);
    }
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
    let body: string | undefined;
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return Response.json({ error: { code: "UNSUPPORTED_CONTENT_TYPE" } }, { status: 415 });
      }
      body = await request.text();
      if (body.length > 16_384) return Response.json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
      JSON.parse(body);
      headers.set("Content-Type", "application/json");
    }

    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });
    const responseBody = await upstream.text();
    try { JSON.parse(responseBody); } catch {
      return Response.json({ error: { code: "INVALID_BACKEND_RESPONSE" } }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(responseBody, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: { code: "CHECKOUT_BACKEND_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = forward;
export const POST = forward;

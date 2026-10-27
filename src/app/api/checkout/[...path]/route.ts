import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = allowedEndpoint(path, request.method);
  if (!endpoint) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
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

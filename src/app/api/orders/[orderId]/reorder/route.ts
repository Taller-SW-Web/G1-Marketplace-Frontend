import { NextRequest } from "next/server";
import { ordersBackendTimeout } from "../../request-timeout";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!/^[A-Za-z0-9-]{1,100}$/.test(orderId)) {
    return Response.json({ error: { code: "INVALID_ORDER_ID" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (request.headers.get("authorization") || request.headers.get("sec-fetch-site") === "cross-site"
    || request.headers.get("origin") !== request.nextUrl.origin || request.nextUrl.search) {
    return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return Response.json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const upstreamOrigin = process.env.G1_WEB_ORIGIN || process.env.H3_FRONTEND_ORIGIN || request.nextUrl.origin;
    const parsedOrigin = new URL(upstreamOrigin);
    if (parsedOrigin.origin !== upstreamOrigin || parsedOrigin.username || parsedOrigin.password
      || parsedOrigin.search || parsedOrigin.hash
      || (parsedOrigin.protocol !== "https:" && !(process.env.NODE_ENV !== "production"
        && parsedOrigin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname)))) {
      throw new Error("Invalid web origin");
    }
    const rawBody = await request.text();
    if (rawBody.length > 0) {
      return Response.json({ error: { code: "EMPTY_BODY_REQUIRED" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const base = new URL(process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000");
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
      || (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) {
      throw new Error("Invalid BFF origin");
    }
    const url = new URL(`/api/v1/orders/${encodeURIComponent(orderId)}/reorder`, base);
    const sessionCookie = request.cookies.get("__Host-g1_session")?.value ?? request.cookies.get("g1_session")?.value;
    const cookieName = request.cookies.has("__Host-g1_session") ? "__Host-g1_session" : "g1_session";
    const response = await fetch(url, {
      method: "POST", cache: "no-store", redirect: "error",
      headers: {
        Accept: "application/json",
        Origin: upstreamOrigin,
        "Idempotency-Key": idempotencyKey,
        ...(sessionCookie && /^[A-Za-z0-9_-]{43}$/.test(sessionCookie) ? { Cookie: `${cookieName}=${sessionCookie}` } : {}),
      },
      signal: AbortSignal.any([request.signal, ordersBackendTimeout()]),
    });
    const body = await response.text();
    JSON.parse(body);
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.ok ? "application/json" : "application/problem+json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: { code: "REORDER_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

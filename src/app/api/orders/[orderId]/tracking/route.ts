import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!/^[A-Za-z0-9-]{1,100}$/.test(orderId)) return Response.json({ error: { code: "INVALID_ORDER_ID" } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const base = new URL(process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000");
    if (base.username || base.password || base.search || base.hash || (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new Error("Invalid BFF origin");
    const url = new URL(`/api/v1/orders/${encodeURIComponent(orderId)}/tracking`, base);
    const sessionCookie = request.cookies.get("__Host-g1_session")?.value ?? request.cookies.get("g1_session")?.value;
    const response = await fetch(url, { cache: "no-store", redirect: "error", headers: {
      Accept: "application/json",
      ...(sessionCookie && /^[A-Za-z0-9_-]{43}$/.test(sessionCookie) ? { Cookie: `${request.cookies.has("__Host-g1_session") ? "__Host-" : ""}g1_session=${sessionCookie}` } : {}),
    }, signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]) });
    const body = await response.text(); JSON.parse(body);
    return new Response(body, { status: response.status, headers: { "Content-Type": response.ok ? "application/json" : "application/problem+json", "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: { code: "TRACKING_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}

import { NextRequest } from "next/server";
import { ordersBackendTimeout } from "../request-timeout";

export const dynamic = "force-dynamic";

function invalidPage(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("page");
  if (raw === null) return 0;
  if (!/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

function invalidPageSize(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("pageSize");
  if (raw === null) return 10;
  if (!/^\d+$/.test(raw)) return null;
  const size = Number(raw);
  return Number.isSafeInteger(size) && size >= 1 && size <= 50 ? size : null;
}

export async function GET(request: NextRequest) {
  const page = invalidPage(request);
  const pageSize = invalidPageSize(request);
  if (page === null || pageSize === null) {
    return Response.json(
      { code: "INVALID_PARAMETERS", message: "Revisa la página solicitada." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const base = new URL(
      process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000",
    );
    if (
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" &&
        !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
    ) {
      throw new Error("Invalid BFF origin");
    }

    const url = new URL("/api/v1/orders/me", base);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    for (const name of ["state", "from", "to"] as const) {
      const value = request.nextUrl.searchParams.get(name);
      if (value !== null) url.searchParams.set(name, value);
    }
    const sessionCookie = request.cookies.get("__Host-g1_session")?.value ?? request.cookies.get("g1_session")?.value;
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        ...(sessionCookie && /^[A-Za-z0-9_-]{43}$/.test(sessionCookie)
          ? { Cookie: `${request.cookies.has("__Host-g1_session") ? "__Host-" : ""}g1_session=${sessionCookie}` }
          : {}),
      },
      signal: AbortSignal.any([request.signal, ordersBackendTimeout()]),
    });
    const body = await response.text();
    JSON.parse(body);

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.ok
          ? "application/json"
          : "application/problem+json",
        "Cache-Control": "no-store",
        "X-Orders-Source": response.headers.get("x-orders-source") || "UNCONFIGURED",
      },
    });
  } catch {
    return Response.json(
      {
        code: "ORDERS_UNAVAILABLE",
        status: 503,
        title: "No pudimos cargar tus pedidos.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

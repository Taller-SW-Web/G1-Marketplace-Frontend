import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse, invalidateSession, mutationGuard, privateHeaders, sandboxEnabled, sessionEntry } from "./server";
import { isProductId } from "./types";
import { parseMove, parseWishlist, record, safeProductPath } from "./contract";

function origin(): URL | null {
  try {
    const base = new URL(process.env.MARKETPLACE_API_URL ?? "http://127.0.0.1:10000");
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
      || !(base.protocol === "https:" || (base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) return null;
    return base;
  } catch { return null; }
}
async function failure(response: Response, request: NextRequest, move: boolean) {
  if (response.status === 401) { invalidateSession(request); return errorResponse("UNAUTHORIZED", 401); }
  if ([404, 405, 501].includes(response.status) && !move) return errorResponse("WISHLIST_UNAVAILABLE", 503);
  const allowed: Record<number, string[]> = {
    400: ["INVALID_REQUEST", "INVALID_PRODUCT_ID"], 404: ["PRODUCT_NOT_AVAILABLE"],
    409: ["STOCK_LIMIT_REACHED", "CART_CONFLICT", "IDEMPOTENCY_CONFLICT", "OPERATION_IN_PROGRESS"],
    422: ["VARIANT_SELECTION_REQUIRED"], 503: ["CATALOG_UNAVAILABLE", "COMMERCE_DATA_UNAVAILABLE", "WISHLIST_UNAVAILABLE"],
  };
  try {
    const body: unknown = await response.json();
    if (record(body) && typeof body.code === "string" && allowed[response.status]?.includes(body.code)) {
      if (body.code === "VARIANT_SELECTION_REQUIRED") {
        if (!safeProductPath(body.redirectUrl)) return errorResponse("INVALID_RESPONSE", 502);
        return NextResponse.json({ code: body.code, redirectUrl: body.redirectUrl }, { status: 422, headers: privateHeaders });
      }
      return errorResponse(body.code, response.status);
    }
  } catch { /* Do not forward arbitrary upstream bodies. */ }
  return errorResponse(move ? "RESULT_UNCERTAIN" : "WISHLIST_UNAVAILABLE", 502);
}
export async function readWishlist(request: NextRequest) {
  if (!sandboxEnabled()) return errorResponse("SANDBOX_DISABLED", 404);
  if (request.headers.get("sec-fetch-site") === "cross-site") return errorResponse("FORBIDDEN", 403);
  if (request.headers.has("authorization") || request.nextUrl.search) return errorResponse("INVALID_REQUEST", 400);
  const session = sessionEntry(request);
  const token = session && process.env[`H3_SANDBOX_TOKEN_${session.identity}`];
  if (!token) return errorResponse("UNAUTHORIZED", 401);
  if (process.env.H3_WISHLIST_READ_ENABLED !== "true") return errorResponse("WISHLIST_UNAVAILABLE", 503);
  const base = origin();
  if (!base) return errorResponse("INTERNAL_ERROR", 500);
  try {
    const response = await fetch(new URL("/api/v1/wishlist", base), {
      cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!response.ok) return failure(response, request, false);
    const items = parseWishlist(await response.json());
    return items ? NextResponse.json(items, { headers: privateHeaders }) : errorResponse("INVALID_RESPONSE", 502);
  } catch { return errorResponse("WISHLIST_UNAVAILABLE", 503); }
}
export async function moveWishlist(request: NextRequest, id: string) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  const session = sessionEntry(request);
  const token = session && process.env[`H3_SANDBOX_TOKEN_${session.identity}`];
  if (!token) return errorResponse("UNAUTHORIZED", 401);
  if (!isProductId(id) || [".", ".."].includes(id)) return errorResponse("INVALID_PRODUCT_ID", 400);
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key) || await request.text())
    return errorResponse("INVALID_REQUEST", 400);
  if (process.env.H3_WISHLIST_MOVE_ENABLED !== "true") return errorResponse("WISHLIST_UNAVAILABLE", 503);
  const base = origin();
  if (!base) return errorResponse("INTERNAL_ERROR", 500);
  try {
    const response = await fetch(new URL(`/api/v1/wishlist/items/${encodeURIComponent(id)}/move-to-cart`, base), {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Idempotency-Key": key },
    });
    if (response.status !== 200) return failure(response, request, true);
    const result = parseMove(await response.json(), id);
    return result ? NextResponse.json(result, { headers: privateHeaders }) : errorResponse("RESULT_UNCERTAIN", 502);
  } catch { return errorResponse("RESULT_UNCERTAIN", 504); }
}

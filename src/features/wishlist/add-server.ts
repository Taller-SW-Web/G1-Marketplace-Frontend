import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { marketplaceApiUrl } from "@/shared/server/marketplace-url";
import { errorResponse, invalidateSession, mutationGuard, privateHeaders, sessionEntry, sandboxEnabled } from "./server";
import { isProductId } from "./types";
import { record } from "./contract";
import { parseCartAddition, variantPath } from "./cart-contract";
import { authRequestGuard, authWebEnabled, bffFetch } from "@/features/auth/server";

export function wishlistCartEnabled() {
  // Keep the existing explicit opt-in: enabling login does not approve cart integration.
  return process.env.H3_WISHLIST_CART_ENABLED === "true"
    && (authWebEnabled() ? process.env.H3_FRONTEND_SANDBOX_ENABLED !== "true" : sandboxEnabled());
}

export async function addFavoriteToCart(request: NextRequest, productId: string) {
  const real = authWebEnabled();
  const rejected = real ? authRequestGuard(request, true) : mutationGuard(request);
  if (rejected) return rejected;
  if (!wishlistCartEnabled()) return errorResponse("SANDBOX_DISABLED", 404);
  const session = sessionEntry(request);
  const token = session && process.env[`H3_SANDBOX_TOKEN_${session.identity}`];
  if (!real && !token) return errorResponse("UNAUTHORIZED", 401);
  if (!isProductId(productId) || [".", ".."].includes(productId)) return errorResponse("INVALID_PRODUCT_ID", 400);
  if (request.headers.has("idempotency-key") || await request.text()) return errorResponse("INVALID_REQUEST", 400);
  let destination: URL;
  try { destination = new URL(`/api/v1/wishlist/items/${encodeURIComponent(productId)}/add-to-cart`, marketplaceApiUrl()); }
  catch { return errorResponse("INTERNAL_ERROR", 500); }
  try {
    // Same opaque G1 session as save/list and the ordinary cart; never accept browser bearer tokens.
    const response = real ? await bffFetch(request, destination.pathname, "POST") : await fetch(destination, { method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]) });
    if (response.status === 401) { invalidateSession(request); return errorResponse("UNAUTHORIZED", 401); }
    const body: unknown = await response.json();
    if (response.status === 200) {
      const result = parseCartAddition(body, productId);
      return result ? NextResponse.json(result, { headers: privateHeaders }) : errorResponse("CART_RESULT_UNCERTAIN", 502);
    }
    const allowed: Record<number, string[]> = {
      400: ["INVALID_REQUEST", "INVALID_PRODUCT_ID"], 401: ["UNAUTHORIZED"],
      404: ["PRODUCT_NOT_AVAILABLE"], 409: ["CART_CONFLICT", "STOCK_LIMIT_REACHED"],
      422: ["VARIANT_SELECTION_REQUIRED"], 503: ["CATALOG_UNAVAILABLE", "COMMERCE_DATA_UNAVAILABLE", "AUTH_UNAVAILABLE"],
    };
    if (record(body) && typeof body.code === "string" && allowed[response.status]?.includes(body.code)) {
      const redirectUrl = body.code === "VARIANT_SELECTION_REQUIRED" ? variantPath(body.redirectUrl) : undefined;
      const safe = errorResponse(body.code, response.status);
      return redirectUrl ? NextResponse.json({ ...await safe.json(), redirectUrl }, { status: response.status, headers: privateHeaders }) : safe;
    }
    return errorResponse("CART_RESULT_UNCERTAIN", 502);
  } catch { return errorResponse("CART_RESULT_UNCERTAIN", 504); }
}

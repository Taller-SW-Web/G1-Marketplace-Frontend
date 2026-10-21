import "server-only";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProductId, publicErrors } from "./types";
import type { Identity } from "./types";
import { authRequestGuard, authWebEnabled, bffFetch } from "@/features/auth/server";

type Entry = { identity: Exclude<Identity, null>; scope: string; expires: number };
const root = globalThis as typeof globalThis & { h3Sessions?: Map<string, Entry> };
const sessions = root.h3Sessions ??= new Map<string, Entry>();
const cookieName = "h3-session";
const ttl = 15 * 60 * 1000;
export const privateHeaders = { "Cache-Control": "no-store, private" };

export function sandboxEnabled() {
  return process.env.H3_FRONTEND_SANDBOX_ENABLED === "true"
    && ["development", "test"].includes(process.env.NODE_ENV ?? "");
}

export function errorResponse(code: string, status: number) {
  return NextResponse.json({ code, message: publicErrors[code] ?? publicErrors.INTERNAL_ERROR },
    { status, headers: privateHeaders });
}

export function mutationGuard(request: NextRequest) {
  if (!sandboxEnabled()) return errorResponse("SANDBOX_DISABLED", 404);
  // NextURL normalizes 127.0.0.1 to localhost. Pin the actual browser origin
  // explicitly instead of trusting Host/Forwarded or relaxing origin equality.
  const expectedOrigin = process.env.H3_FRONTEND_ORIGIN ?? "http://127.0.0.1:3000";
  try {
    const parsed = new URL(expectedOrigin);
    if (parsed.origin !== expectedOrigin || !["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid origin");
  } catch { return errorResponse("INTERNAL_ERROR", 500); }
  if (request.headers.get("origin") !== expectedOrigin
    || request.headers.get("sec-fetch-site") === "cross-site") return errorResponse("FORBIDDEN", 403);
  if (request.headers.has("authorization") || request.nextUrl.search) return errorResponse("INVALID_REQUEST", 400);
  return null;
}

function prune() {
  for (const [key, entry] of sessions) if (entry.expires <= Date.now()) sessions.delete(key);
}

export function sessionEntry(request: NextRequest) {
  if (!sandboxEnabled()) return undefined;
  prune();
  return sessions.get(request.cookies.get(cookieName)?.value ?? "");
}

export function invalidateSession(request: NextRequest) {
  sessions.delete(request.cookies.get(cookieName)?.value ?? "");
}

export function readSession(request: NextRequest) {
  const entry = sessionEntry(request);
  return NextResponse.json({ enabled: sandboxEnabled(), identity: entry?.identity ?? null,
    scope: entry?.scope ?? "anonymous" }, { headers: privateHeaders });
}

export async function changeSession(request: NextRequest) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("INVALID_REQUEST", 400); }
  if (!body || typeof body !== "object" || Object.keys(body).length !== 1 || !("identity" in body)
    || ![null, "A", "B"].includes(body.identity as Identity)) return errorResponse("INVALID_REQUEST", 400);
  const identity = body.identity as Identity;
  if (identity && !process.env[`H3_SANDBOX_TOKEN_${identity}`]) return errorResponse("SANDBOX_DISABLED", 503);
  invalidateSession(request);
  prune();
  // Bound memory for this single-process local demo.
  if (sessions.size >= 1000) return errorResponse("INTERNAL_ERROR", 503);
  const id = identity ? randomUUID() : "";
  const scope = identity ? randomUUID() : "anonymous";
  if (identity) sessions.set(id, { identity, scope, expires: Date.now() + ttl });
  const response = NextResponse.json({ enabled: true, identity, scope }, { headers: privateHeaders });
  response.cookies.set(cookieName, id, { httpOnly: true, sameSite: "strict", path: "/",
    secure: new URL(request.url).protocol === "https:", maxAge: identity ? ttl / 1000 : 0 });
  return response;
}

export async function mutateWishlist(request: NextRequest, method: "POST" | "DELETE", pathId?: string) {
  const real = authWebEnabled();
  const rejected = real ? authRequestGuard(request, true) : mutationGuard(request);
  if (rejected) return rejected;
  const entry = sessionEntry(request);
  const token = entry && process.env[`H3_SANDBOX_TOKEN_${entry.identity}`];
  if (!real && (!entry || !token)) return errorResponse("UNAUTHORIZED", 401);
  let productId: unknown = pathId;
  if (method === "POST") {
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse("INVALID_REQUEST", 400); }
    if (!body || typeof body !== "object" || Object.keys(body).length !== 1 || !("productId" in body))
      return errorResponse("INVALID_REQUEST", 400);
    productId = body.productId;
  } else if (await request.text()) {
    return errorResponse("INVALID_REQUEST", 400);
  }
  if (!isProductId(productId)) return errorResponse("INVALID_PRODUCT_ID", 400);
  let base: URL;
  try {
    base = new URL(process.env.MARKETPLACE_API_URL ?? "http://127.0.0.1:10000");
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
      || !(base.protocol === "https:" || (base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))))
      throw new Error("Invalid base");
  } catch { return errorResponse("INTERNAL_ERROR", 500); }
  // Dot segments cannot be represented safely as standalone URL path segments.
  // Treat them as unavailable on this transport instead of normalizing to a different endpoint.
  if (method === "DELETE" && [".", ".."].includes(productId)) return errorResponse("INVALID_PRODUCT_ID", 400);
  const destination = new URL(`/api/v1/wishlist/items${method === "DELETE" ? `/${encodeURIComponent(productId)}` : ""}`, base);
  try {
    const response = real ? await bffFetch(request, destination.pathname, method, method === "POST" ? { productId } : undefined) : await fetch(destination, { method, redirect: "error", cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify({ productId }) } : {}),
    });
    if (method === "DELETE" && response.status === 204) return new NextResponse(null, { status: 204, headers: privateHeaders });
    if (method === "POST" && [200, 201].includes(response.status)) {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "productId" in body && body.productId === productId)
        return NextResponse.json({ productId }, { status: response.status, headers: privateHeaders });
      return errorResponse("RESULT_UNCERTAIN", 502);
    }
    const codes: Record<number, readonly string[]> = { 400: ["INVALID_REQUEST", "INVALID_PRODUCT_ID"],
      401: ["UNAUTHORIZED"], 404: ["PRODUCT_NOT_AVAILABLE"], 503: ["CATALOG_UNAVAILABLE"], 500: ["INTERNAL_ERROR"] };
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "code" in body && typeof body.code === "string"
      && codes[response.status]?.includes(body.code)) {
      if (response.status === 401) invalidateSession(request);
      return errorResponse(body.code, response.status);
    }
    return errorResponse("RESULT_UNCERTAIN", 502);
  } catch {
    // A network failure/invalid response does not prove whether a write reached PostgreSQL.
    return errorResponse("RESULT_UNCERTAIN", 504);
  }
}

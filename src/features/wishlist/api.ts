import type { Identity, Operation, Session } from "./types";
import { publicErrors } from "./types";

export class WishlistError extends Error {
  constructor(public code: string, public status: number, public redirectUrl?: string) {
    super(publicErrors[code] ?? publicErrors.INTERNAL_ERROR);
  }
}

async function failed(response: Response): Promise<never> {
  let code = "INTERNAL_ERROR";
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "code" in body && typeof body.code === "string" && Object.hasOwn(publicErrors, body.code)) code = body.code;
  } catch { code = "RESULT_UNCERTAIN"; }
  throw new WishlistError(code, response.status);
}

export async function getSession(signal?: AbortSignal, identity?: Identity, realAuth = false): Promise<Session> {
  if (realAuth) {
    if (identity !== undefined) throw new WishlistError("FORBIDDEN", 403);
    const response = await fetch("/api/v1/auth/session", { cache: "no-store", signal });
    if (!response.ok) return failed(response);
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("authenticated" in result) || !("scope" in result) || typeof result.scope !== "string") throw new WishlistError("INVALID_RESPONSE", 502);
    if (!result.authenticated) return { identity: null, scope: "anonymous", enabled: true };
    if (!("user" in result) || !result.user || typeof result.user !== "object" || !("id" in result.user) || typeof result.user.id !== "string") throw new WishlistError("INVALID_RESPONSE", 502);
    return { identity: result.user.id, scope: result.scope, enabled: true };
  }
  const response = await fetch("/api/h3/session", { cache: "no-store", signal,
    ...(identity !== undefined ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity }) } : {}) });
  if (!response.ok) return failed(response);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("identity" in body) || !("scope" in body) || !("enabled" in body)
    || !["A", "B", null].includes(body.identity as Identity) || typeof body.scope !== "string" || typeof body.enabled !== "boolean")
    throw new WishlistError("INTERNAL_ERROR", 502);
  return body as Session;
}

export async function mutateItem(productId: string, operation: Operation, signal?: AbortSignal) {
  try {
    const response = await fetch(`/api/wishlist/items${operation === "remove" ? `/${encodeURIComponent(productId)}` : ""}`, {
      method: operation === "save" ? "POST" : "DELETE", cache: "no-store",
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(12000)]),
      ...(operation === "save" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) } : {}),
    });
    if (!response.ok) return failed(response);
    if (operation === "remove" && response.status === 204) return;
    if (operation === "save" && [200, 201].includes(response.status)) {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "productId" in body && body.productId === productId) return;
    }
    throw new WishlistError("RESULT_UNCERTAIN", 502);
  } catch (error) {
    if (error instanceof WishlistError) throw error;
    throw new WishlistError("RESULT_UNCERTAIN", 504);
  }
}

import { mutateItem, WishlistError } from "./api";
import { parseMove, parseWishlist, record, safeProductPath, toFavorite } from "./contract";
import type { FavoriteProduct, MoveResult } from "./contract";
import { publicErrors } from "./types";

export interface FavoritesTransport {
  list(signal: AbortSignal): Promise<FavoriteProduct[]>;
  remove(productId: string, signal: AbortSignal): Promise<void>;
  save(productId: string, signal: AbortSignal): Promise<void>;
  move(productId: string, key: string, signal: AbortSignal): Promise<MoveResult>;
}
async function payload(response: Response, move = false): Promise<unknown> {
  let body: unknown;
  try { body = await response.json(); } catch { throw new WishlistError(move ? "RESULT_UNCERTAIN" : "INVALID_RESPONSE", 502); }
  if (!response.ok) {
    const code = record(body) && typeof body.code === "string" && Object.hasOwn(publicErrors, body.code) ? body.code : "INTERNAL_ERROR";
    throw new WishlistError(code, response.status, record(body) && safeProductPath(body.redirectUrl) ? body.redirectUrl : undefined);
  }
  return body;
}
export const httpFavorites: FavoritesTransport = {
  async list(signal) {
    try {
      const response = await fetch("/api/wishlist", { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
      const parsed = parseWishlist(await payload(response));
      if (!parsed) throw new WishlistError("INVALID_RESPONSE", 502);
      return parsed.map(toFavorite);
    } catch (error) {
      if (error instanceof WishlistError || signal.aborted) throw error;
      throw new WishlistError("WISHLIST_UNAVAILABLE", 503);
    }
  },
  remove: (id, signal) => mutateItem(id, "remove", signal),
  save: (id, signal) => mutateItem(id, "save", signal),
  async move(id, key, signal) {
    try {
      const response = await fetch(`/api/wishlist/items/${encodeURIComponent(id)}/move-to-cart`, {
        method: "POST", cache: "no-store", headers: { "Idempotency-Key": key },
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      const parsed = parseMove(await payload(response, true), id);
      if (!parsed || response.status !== 200) throw new WishlistError("RESULT_UNCERTAIN", 502);
      return parsed;
    } catch (error) {
      if (error instanceof WishlistError || signal.aborted) throw error;
      throw new WishlistError("RESULT_UNCERTAIN", 504);
    }
  },
};

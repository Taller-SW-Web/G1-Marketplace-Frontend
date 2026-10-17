import { mutateItem, WishlistError } from "./api";
import { parseWishlist, record, toFavorite } from "./contract";
import type { FavoriteProduct } from "./contract";
import { publicErrors } from "./types";

export interface FavoritesTransport {
  list(signal: AbortSignal): Promise<FavoriteProduct[]>;
  remove(productId: string, signal: AbortSignal): Promise<void>;
  save(productId: string, signal: AbortSignal): Promise<void>;
}
async function payload(response: Response): Promise<unknown> {
  let body: unknown;
  try { body = await response.json(); } catch { throw new WishlistError("INVALID_RESPONSE", 502); }
  if (!response.ok) {
    const code = record(body) && typeof body.code === "string" && Object.hasOwn(publicErrors, body.code) ? body.code : "INTERNAL_ERROR";
    throw new WishlistError(code, response.status);
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
};

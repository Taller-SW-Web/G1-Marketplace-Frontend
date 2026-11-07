import { mutateItem, WishlistError } from "./api";
import { parseWishlist, record, toFavorite } from "./contract";
import type { FavoriteProduct } from "./contract";
import { parseCartAddition, variantPath } from "./cart-contract";
import { publicErrors } from "./types";

export interface FavoritesTransport {
  addToCart?(productId: string, signal: AbortSignal): Promise<void>;
  list(signal: AbortSignal): Promise<FavoriteProduct[]>;
  remove(productId: string, signal: AbortSignal): Promise<void>;
  save(productId: string, signal: AbortSignal): Promise<void>;
}
async function payload(response: Response): Promise<unknown> {
  let body: unknown;
  try { body = await response.json(); } catch { throw new WishlistError("INVALID_RESPONSE", 502); }
  if (!response.ok) {
    const code = record(body) && typeof body.code === "string" && Object.hasOwn(publicErrors, body.code) ? body.code : "INTERNAL_ERROR";
    throw new WishlistError(code, response.status, record(body) ? variantPath(body.redirectUrl) : undefined);
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

// Selected only when the server enables the existing cart integration opt-in.
export const httpFavoritesWithCart: FavoritesTransport = {
  ...httpFavorites,
  async addToCart(id, signal) {
    try {
      const response = await fetch(`/api/wishlist/items/${encodeURIComponent(id)}/add-to-cart`, {
        method: "POST", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      const result = parseCartAddition(await payload(response), id);
      if (!result) throw new WishlistError("CART_RESULT_UNCERTAIN", 502);
    } catch (error) {
      if (error instanceof WishlistError && !["INVALID_RESPONSE", "INTERNAL_ERROR"].includes(error.code)) throw error;
      throw new WishlistError("CART_RESULT_UNCERTAIN", 504);
    }
  },
};

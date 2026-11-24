import { afterEach, expect, it, vi } from "vitest";
import { httpFavoritesWithCart } from "../../src/features/wishlist/transport";
afterEach(() => vi.unstubAllGlobals());
it("sends a bodyless cart addition and validates its snapshot", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ productId: "P1", cart: { cartId: "C1", version: 1, items: [{ sku: "SKU-1", quantity: 1 }] } }));
  vi.stubGlobal("fetch", fetch);
  await httpFavoritesWithCart.addToCart!("P1", new AbortController().signal);
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/wishlist/items/P1/add-to-cart", expect.objectContaining({ method: "POST", cache: "no-store" }));
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
});
it("preserves valid variant destinations and rejects malformed successful writes as uncertain", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ code: "VARIANT_SELECTION_REQUIRED", redirectUrl: "/productos/zapatilla" }, { status: 422 }))
    .mockResolvedValueOnce(Response.json({ productId: "other" })));
  await expect(httpFavoritesWithCart.addToCart!("P1", new AbortController().signal)).rejects.toMatchObject({ code: "VARIANT_SELECTION_REQUIRED", redirectUrl: "/productos/zapatilla" });
  await expect(httpFavoritesWithCart.addToCart!("P1", new AbortController().signal)).rejects.toMatchObject({ code: "CART_RESULT_UNCERTAIN" });
});
it("does not retry an uncertain network failure", async () => {
  const fetch = vi.fn().mockRejectedValue(new Error("disconnected")); vi.stubGlobal("fetch", fetch);
  await expect(httpFavoritesWithCart.addToCart!("P1", new AbortController().signal)).rejects.toMatchObject({ code: "CART_RESULT_UNCERTAIN" });
  expect(fetch).toHaveBeenCalledOnce();
});

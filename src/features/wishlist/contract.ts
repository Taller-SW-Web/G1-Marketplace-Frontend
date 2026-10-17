import { isProductId } from "./types";

// Proposed wire contract, documented in FAVORITOS-FRONTEND-HANDOFF.md.
export type Availability = "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
export type WishlistItemDTO = {
  productId: string; createdAt: string; name: string | null; slug: string | null;
  brand: string | null; image: { url: string; alt: string } | null;
  price: { amount: number; currency: string } | null; availability: Availability;
};
export type FavoriteProduct = {
  productId: string; name: string; slug: string | null; image: { url: string; alt: string } | null;
  availability: "in_stock" | "out_of_stock" | "unavailable";
  createdAt?: string; categoryId?: string; brandId?: string;
  description?: string; categoryLabel?: string; brandLabel?: string; color?: string;
  price?: { amount: number; currency: string };
};

export const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function price(value: unknown): value is { amount: number; currency: string } {
  return record(value) && typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount >= 0
    && typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency);
}
export function parseWishlist(value: unknown): WishlistItemDTO[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const result: WishlistItemDTO[] = [];
  for (const item of value) {
    if (!record(item) || !isProductId(item.productId) || ids.has(item.productId)
      || typeof item.createdAt !== "string" || !/^\d{4}-\d\d-\d\dT/.test(item.createdAt) || !Number.isFinite(Date.parse(item.createdAt))
      || !["AVAILABLE", "OUT_OF_STOCK", "UNAVAILABLE"].includes(String(item.availability))
      || !(item.name === null || nonempty(item.name)) || !(item.brand === null || nonempty(item.brand))
      || !(item.slug === null || (typeof item.slug === "string" && slugPattern.test(item.slug)))
      || !(item.price === null || price(item.price))) return null;
    if (item.availability !== "UNAVAILABLE" && (!nonempty(item.name) || !item.slug)) return null;
    let image: WishlistItemDTO["image"] = null;
    if (item.image !== null) {
      if (!record(item.image) || !nonempty(item.image.alt) || typeof item.image.url !== "string"
        || !(/^https:\/\//.test(item.image.url) || /^\/(?:figma|fixtures)\/[a-zA-Z0-9_.-]+$/.test(item.image.url))) return null;
      image = { url: item.image.url, alt: item.image.alt };
    }
    ids.add(item.productId);
    result.push({ productId: item.productId, createdAt: item.createdAt, name: item.name as string | null,
      slug: item.slug as string | null, brand: item.brand as string | null, image,
      price: item.price === null ? null : { amount: item.price.amount, currency: item.price.currency }, availability: item.availability as Availability });
  }
  return result;
}
export function toFavorite(item: WishlistItemDTO): FavoriteProduct {
  return { productId: item.productId, createdAt: item.createdAt, name: item.name ?? "Producto no disponible", slug: item.slug,
    image: item.image, brandLabel: item.brand ?? undefined, price: item.price ?? undefined,
    availability: item.availability === "AVAILABLE" ? "in_stock" : item.availability === "OUT_OF_STOCK" ? "out_of_stock" : "unavailable" };
}

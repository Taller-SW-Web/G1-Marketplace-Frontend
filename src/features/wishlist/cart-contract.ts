import { record } from "./contract";

// Strip upstream fields and validate the existing backend cart snapshot.
export function parseCartAddition(value: unknown, productId: string) {
  if (!record(value) || value.productId !== productId || !record(value.cart)) return null;
  const cart = value.cart;
  if (typeof cart.cartId !== "string" || !cart.cartId || !Number.isSafeInteger(cart.version)
    || (cart.version as number) < 0 || !Array.isArray(cart.items) || !cart.items.length) return null;
  const items = [];
  const skus = new Set<string>();
  for (const item of cart.items) {
    if (!record(item) || typeof item.sku !== "string" || !item.sku || skus.has(item.sku)
      || !Number.isSafeInteger(item.quantity) || (item.quantity as number) < 1) return null;
    skus.add(item.sku);
    let unitPrice;
    if (item.unitPrice !== undefined) {
      const price = item.unitPrice;
      if (!record(price) || typeof price.amount !== "number" || !Number.isFinite(price.amount)
        || price.amount < 0 || typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)
        || !Number.isSafeInteger(price.version) || (price.version as number) < 0) return null;
      unitPrice = { amount: price.amount, currency: price.currency, version: price.version as number };
    }
    items.push({ sku: item.sku, quantity: item.quantity as number, ...(unitPrice ? { unitPrice } : {}) });
  }
  return { productId, cart: { cartId: cart.cartId, version: cart.version as number, items } };
}
export function variantPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/productos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : undefined;
}

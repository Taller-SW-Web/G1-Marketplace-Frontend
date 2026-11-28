import type { CartItemPreview } from "@/features/cart/types";

// Read model returned by the BFF (BE #331 / SPECS #19): G7 has no phone, so the BFF
// never returns it; label and reference only come when G7 has them.
export type CheckoutAddress = {
  addressId: string;
  label?: string;
  street: string;
  district: string;
  province: string;
  department: string;
  reference?: string;
  phone?: string;
};

// Create payload: the BFF still validates phone as part of the form (DTO), label is optional.
export type CheckoutAddressInput = {
  label?: string;
  street: string;
  district: string;
  province: string;
  department: string;
  reference?: string;
  phone: string;
};

export type CheckoutQuote = {
  quoteId: string;
  expiresAt: number;
  subtotal: number;
  discount: number;
  shipping: number;
  estimatedDays: number;
  total: number;
  addressId: string;
  cartVersion: number;
  lines: CartItemPreview[];
  selectedBenefit?: { type: string; id: string; discount: number };
};

export const checkoutFixtureAddresses: CheckoutAddress[] = [
  { addressId: "ADR-MOCK-0001", label: "Casa", street: "Av. Lima 123", district: "Miraflores", province: "Lima", department: "Lima", reference: "Dpto. 402", phone: "999999999" },
  { addressId: "ADR-MOCK-0002", label: "Trabajo", street: "Jr. Comercio 450", district: "San Isidro", province: "Lima", department: "Lima", phone: "988888888" },
];

type FixtureCart = { version: number; subtotal: number; lines: CartItemPreview[] };

export const checkoutFixtureCart: FixtureCart = {
  version: 1,
  subtotal: 340,
  lines: [
    { sku: "SKU-MOCK-001", quantity: 1, name: "Camiseta de entrenamiento (demo)", imageUrl: "/fixtures/product-0.svg" },
    { sku: "SKU-MOCK-002", quantity: 1, name: "Calzado deportivo (demo)", imageUrl: "/fixtures/product-1.svg" },
  ],
};

export function createFixtureQuote(addressId: string, now = Date.now(), cart = checkoutFixtureCart): CheckoutQuote {
  const { subtotal, version, lines } = cart;
  return {
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    expiresAt: now + 5 * 60_000,
    subtotal,
    discount: 0,
    shipping: 15,
    estimatedDays: 2,
    total: subtotal + 15,
    addressId,
    cartVersion: version,
    lines,
  };
}

export function applyFixtureCoupon(quote: CheckoutQuote, input: string, now = Date.now()) {
  const coupon = input.trim().toUpperCase();
  if (coupon !== "SAVE20" && coupon !== "DEPORTE20") return null;
  const discount = Math.min(20, quote.subtotal);
  return {
    ...quote,
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    selectedBenefit: { type: "COUPON", id: coupon, discount },
    discount,
    total: quote.subtotal - discount + quote.shipping,
    expiresAt: now + 5 * 60_000,
  };
}

export function removeFixtureCoupon(quote: CheckoutQuote, now = Date.now()): CheckoutQuote {
  return {
    ...quote,
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    selectedBenefit: undefined,
    discount: 0,
    total: quote.subtotal + quote.shipping,
    expiresAt: now + 5 * 60_000,
  };
}

export const formatCheckoutMoney = (amount: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);

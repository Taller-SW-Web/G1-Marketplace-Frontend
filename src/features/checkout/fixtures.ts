export type CheckoutAddress = {
  addressId: string;
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
  total: number;
  addressId: string;
  cartVersion: number;
  coupon?: string;
};

export const checkoutFixtureAddresses: CheckoutAddress[] = [
  { addressId: "ADR-MOCK-0001", label: "Casa", street: "Av. Lima 123", district: "Miraflores", province: "Lima", department: "Lima", reference: "Dpto. 402", phone: "999999999" },
  { addressId: "ADR-MOCK-0002", label: "Trabajo", street: "Jr. Comercio 450", district: "San Isidro", province: "Lima", department: "Lima", phone: "988888888" },
];

export const checkoutFixtureCart = {
  version: 1,
  lines: [{ sku: "SKU-MOCK-001", quantity: 1 }, { sku: "SKU-MOCK-002", quantity: 1 }],
};

export function createFixtureQuote(addressId: string, now = Date.now()): CheckoutQuote {
  const subtotal = checkoutFixtureCart.lines.length * 170;
  return {
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    expiresAt: now + 5 * 60_000,
    subtotal,
    discount: 0,
    shipping: 15,
    total: subtotal + 15,
    addressId,
    cartVersion: checkoutFixtureCart.version,
  };
}

export function applyFixtureCoupon(quote: CheckoutQuote, input: string, now = Date.now()) {
  const coupon = input.trim().toUpperCase();
  if (coupon !== "SAVE20" && coupon !== "DEPORTE20") return null;
  const discount = Math.min(20, quote.subtotal);
  return {
    ...quote,
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    coupon,
    discount,
    total: quote.subtotal - discount + quote.shipping,
    expiresAt: now + 5 * 60_000,
  };
}

export function removeFixtureCoupon(quote: CheckoutQuote, now = Date.now()): CheckoutQuote {
  return {
    ...quote,
    quoteId: `Q-MOCK-${crypto.randomUUID()}`,
    coupon: undefined,
    discount: 0,
    total: quote.subtotal + quote.shipping,
    expiresAt: now + 5 * 60_000,
  };
}

export const formatCheckoutMoney = (amount: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);

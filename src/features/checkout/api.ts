import type { CheckoutAddress, CheckoutQuote } from "./fixtures";

type Envelope<T> = { data: T };
export type CheckoutOperation = {
  checkoutOperationId: string;
  state: "PREPARED" | "SUBMITTED" | "SUCCEEDED" | "FAILED";
  orderId?: string;
  orderState?: "CREADO" | "PAGADO" | "ANULADO";
  recoveryRequired?: boolean;
  failureCode?: string;
};
export type Contact = {
  fullName: string;
  documentType: "DNI" | "CE" | "PASSPORT";
  documentNumber: string;
  phone: string;
  email: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAddress(value: unknown): CheckoutAddress {
  if (!isRecord(value) || typeof value.addressId !== "string" || typeof value.street !== "string" ||
      typeof value.district !== "string" || typeof value.province !== "string" ||
      typeof value.department !== "string" || typeof value.phone !== "string" ||
      (value.label !== undefined && typeof value.label !== "string") ||
      (value.reference !== undefined && typeof value.reference !== "string")) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  return {
    addressId: value.addressId,
    street: value.street,
    district: value.district,
    province: value.province,
    department: value.department,
    phone: value.phone,
    ...(typeof value.label === "string" ? { label: value.label } : {}),
    ...(typeof value.reference === "string" ? { reference: value.reference } : {}),
  };
}

function parseOperation(value: unknown): CheckoutOperation {
  if (!isRecord(value) || typeof value.checkoutOperationId !== "string" ||
      !["PREPARED", "SUBMITTED", "SUCCEEDED", "FAILED"].includes(String(value.state)) ||
      (value.orderId !== undefined && typeof value.orderId !== "string") ||
      (value.orderState !== undefined && !["CREADO", "PAGADO", "ANULADO"].includes(String(value.orderState))) ||
      (value.recoveryRequired !== undefined && typeof value.recoveryRequired !== "boolean") ||
      (value.failureCode !== undefined && typeof value.failureCode !== "string")) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  return value as CheckoutOperation;
}

export class CheckoutApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

export function isVerifiedPaidOperation(operation: CheckoutOperation): operation is CheckoutOperation & { orderId: string } {
  return operation.state === "SUCCEEDED" && operation.orderState === "PAGADO" && typeof operation.orderId === "string" && operation.orderId.length > 0;
}

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`/api/checkout/${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new CheckoutApiError(response.status, "INVALID_BACKEND_RESPONSE"); }
  if (!response.ok) {
    const code = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "object" && payload.error !== null && "code" in payload.error && typeof payload.error.code === "string" ? payload.error.code : "CHECKOUT_REQUEST_FAILED";
    throw new CheckoutApiError(response.status, code);
  }
  if (typeof payload !== "object" || payload === null || !("data" in payload)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  return (payload as Envelope<T>).data;
}

type BackendQuote = {
  quoteId: string;
  expiresAt: string;
  subtotal: { amount: number };
  discount: { amount: number };
  shipping: { amount: number };
  total: { amount: number };
  addressId: string;
  cartVersion: number;
  selectedBenefit?: { id: string };
};

function normalizeQuote(payload: unknown): CheckoutQuote {
  if (!isRecord(payload)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  const quote = payload as unknown as BackendQuote;
  const validMoney = (money: unknown): money is { amount: number } => isRecord(money) && typeof money.amount === "number" && Number.isFinite(money.amount);
  if (typeof quote.quoteId !== "string" || typeof quote.expiresAt !== "string" ||
      !validMoney(quote.subtotal) || !validMoney(quote.discount) || !validMoney(quote.shipping) ||
      !validMoney(quote.total) || typeof quote.addressId !== "string" ||
      typeof quote.cartVersion !== "number" || !Number.isInteger(quote.cartVersion) ||
      (quote.selectedBenefit !== undefined && (!isRecord(quote.selectedBenefit) || typeof quote.selectedBenefit.id !== "string"))) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  const expiresAt = Date.parse(quote.expiresAt);
  if (!Number.isFinite(expiresAt) || !quote.quoteId || !Number.isFinite(quote.total?.amount)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  return {
    quoteId: quote.quoteId,
    expiresAt,
    subtotal: quote.subtotal.amount,
    discount: quote.discount.amount,
    shipping: quote.shipping.amount,
    total: quote.total.amount,
    addressId: quote.addressId,
    cartVersion: quote.cartVersion,
    ...(quote.selectedBenefit ? { coupon: quote.selectedBenefit.id } : {}),
  };
}

export const checkoutApi = {
  async listAddresses() {
    const addresses: unknown = await request("delivery-addresses", "GET");
    if (!Array.isArray(addresses)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
    return addresses.map(parseAddress);
  },
  async createAddress(address: Omit<CheckoutAddress, "addressId">) {
    return parseAddress(await request("delivery-addresses", "POST", address));
  },
  async createQuote(addressId: string, cartVersion: number) {
    return normalizeQuote(await request("quotes", "POST", { addressId, cartVersion }));
  },
  async applyBenefit(quoteId: string, couponCode?: string) {
    return normalizeQuote(await request("benefits", "POST", { quoteId, couponCode }));
  },
  async prepare(quoteId: string, cartVersion: number, idempotencyKey: string) {
    return parseOperation(await request("preparations", "POST", { quoteId, cartVersion, simulationConfirmed: true }, idempotencyKey));
  },
  async createOrder(operationId: string, contact: Contact, idempotencyKey: string) {
    return parseOperation(await request("orders", "POST", { checkoutOperationId: operationId, contact }, idempotencyKey));
  },
  async getOperation(operationId: string) {
    return parseOperation(await request(`operations/${encodeURIComponent(operationId)}`, "GET"));
  },
};

export const backendMockEnabled = process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock";

import type { CheckoutAddress, CheckoutQuote } from "./fixtures";

type Envelope<T> = { data: T };
export type CheckoutOperation = {
  checkoutOperationId: string;
  state: "PREPARED" | "SUBMITTED" | "SUCCEEDED" | "FAILED";
  orderId?: string;
  orderState?: "CREADO" | "PAGADO" | "ANULADO";
  orderTotal?: number;
  orderCreatedAt?: string;
  recoveryRequired?: boolean;
  failureCode?: string;
};
export type Contact = {
  fullName: string;
  documentType: "DNI" | "RUC" | "CE" | "PASAPORTE";
  documentNumber: string;
  phone: string;
  email: string;
};
export type CheckoutCartSnapshot = {
  cartId: string | null;
  version: number;
  items: Array<{ sku: string; quantity: number }>;
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

function parseOperation(value: unknown, operationId?: string): CheckoutOperation {
  if (!isRecord(value) ||
      (typeof value.checkoutOperationId !== "string" && !operationId) ||
      !["PREPARED", "SUBMITTED", "SUCCEEDED", "FAILED"].includes(String(value.state))) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }

  const operation: CheckoutOperation = {
    checkoutOperationId: typeof value.checkoutOperationId === "string" ? value.checkoutOperationId : operationId!,
    state: value.state as CheckoutOperation["state"],
    ...(typeof value.recoveryRequired === "boolean" ? { recoveryRequired: value.recoveryRequired } : {}),
    ...(typeof value.failureCode === "string" ? { failureCode: value.failureCode } : {}),
  };

  if (value.order !== undefined) {
    if (!isRecord(value.order) || typeof value.order.orderId !== "string" ||
        !["CREADO", "PAGADO", "ANULADO"].includes(String(value.order.state)) ||
        !isRecord(value.order.total) || typeof value.order.total.amount !== "number" || !Number.isFinite(value.order.total.amount) ||
        value.order.total.currency !== "PEN" || typeof value.order.createdAt !== "string" ||
        !Number.isFinite(Date.parse(value.order.createdAt))) {
      throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
    }
    operation.orderId = value.order.orderId;
    operation.orderState = value.order.state as NonNullable<CheckoutOperation["orderState"]>;
    operation.orderTotal = value.order.total.amount;
    operation.orderCreatedAt = value.order.createdAt;
  } else {
    const flatTotal = isRecord(value.total) ? value.total : undefined;
    const flatTotalAmount = typeof value.orderTotal === "number"
      ? value.orderTotal
      : flatTotal && typeof flatTotal.amount === "number" && Number.isFinite(flatTotal.amount) && flatTotal.currency === "PEN"
        ? flatTotal.amount
        : undefined;
    const flatCreatedAt = typeof value.orderCreatedAt === "string"
      ? value.orderCreatedAt
      : typeof value.createdAt === "string"
        ? value.createdAt
        : undefined;
    if ((value.orderId !== undefined && typeof value.orderId !== "string") ||
        (value.orderState !== undefined && !["CREADO", "PAGADO", "ANULADO"].includes(String(value.orderState))) ||
        (value.orderTotal !== undefined && (typeof value.orderTotal !== "number" || !Number.isFinite(value.orderTotal))) ||
        (value.total !== undefined && !isRecord(value.total)) ||
        (flatTotal !== undefined && (typeof flatTotal.amount !== "number" || !Number.isFinite(flatTotal.amount) || flatTotal.currency !== "PEN")) ||
        (value.orderCreatedAt !== undefined && (typeof value.orderCreatedAt !== "string" || !Number.isFinite(Date.parse(value.orderCreatedAt)))) ||
        (value.createdAt !== undefined && (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))))) {
      throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
    }
    if (typeof value.orderId === "string") operation.orderId = value.orderId;
    if (typeof value.orderState === "string") operation.orderState = value.orderState as NonNullable<CheckoutOperation["orderState"]>;
    if (flatTotalAmount !== undefined) operation.orderTotal = flatTotalAmount;
    if (flatCreatedAt !== undefined) operation.orderCreatedAt = flatCreatedAt;
  }
  if ((value.recoveryRequired !== undefined && typeof value.recoveryRequired !== "boolean") ||
      (value.failureCode !== undefined && typeof value.failureCode !== "string")) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  return operation;
}

export class CheckoutApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

const publicErrorMessages: Record<string, string> = {
  ADDRESS_NOT_FOUND: "No encontramos esa dirección. Selecciona otra o agrega una nueva.",
  ADDRESS_SERVICE_UNAVAILABLE: "No pudimos cargar las direcciones. Inténtalo más tarde.",
  BENEFITS_UNAVAILABLE: "No pudimos validar el beneficio. Puedes conservar el resumen actual.",
  CART_CHANGED: "Tu carrito cambió. Vuelve al carrito y actualiza el resumen.",
  CART_AUTH_UNAVAILABLE: "No pudimos validar tu sesión para consultar el carrito. Inténtalo de nuevo.",
  CART_BACKEND_UNAVAILABLE: "No pudimos consultar tu carrito. Inténtalo de nuevo.",
  CART_BACKEND_MODE_DISABLED: "La consulta del carrito no está disponible en este entorno.",
  CART_EMPTY: "Agrega un producto al carrito para continuar.",
  CART_NOT_FOUND: "No encontramos un carrito activo. Vuelve al carrito para continuar.",
  CHECKOUT_BACKEND_UNAVAILABLE: "No pudimos comunicarnos con Checkout. Inténtalo más tarde.",
  CONTACT_VALIDATION_ERROR: "Revisa los datos de contacto e inténtalo de nuevo.",
  COUPON_NOT_APPLICABLE: "Ese cupón no se puede aplicar a esta compra.",
  INVALID_COUPON_FORMAT: "Revisa el código promocional e inténtalo de nuevo.",
  INVALID_BACKEND_RESPONSE: "Recibimos una respuesta inesperada. Inténtalo más tarde.",
  LINE_NOT_AVAILABLE: "Uno o más productos del carrito ya no están disponibles.",
  NO_SHIPPING_COVERAGE: "No hay cobertura de envío para esta dirección.",
  OPERATION_NOT_PREPARED: "No pudimos continuar con esta operación. Revisa el resumen.",
  ORDER_CREATION_PENDING: "Tu pedido sigue en proceso de verificación.",
  QUOTE_EXPIRED: "La cotización venció. Actualiza el resumen para continuar.",
  QUOTE_UNAVAILABLE: "No pudimos calcular el envío. Inténtalo más tarde.",
  REVALIDATION_UNAVAILABLE: "No pudimos verificar la disponibilidad. Inténtalo más tarde.",
  SALES_UNAVAILABLE: "No pudimos registrar el pedido. Conservamos la operación para verificarla.",
  SIMULATION_NOT_CONFIRMED: "Confirma que entiendes que esta compra es una simulación.",
  STOCK_NOT_AVAILABLE: "La disponibilidad cambió. Vuelve al carrito y revisa los productos.",
};

export function checkoutErrorMessage(error: unknown, fallback: string) {
  if (error instanceof CheckoutApiError) return publicErrorMessages[error.code] ?? fallback;
  return fallback;
}

export function isVerifiedPaidOperation(operation: CheckoutOperation): operation is CheckoutOperation & { orderId: string; orderTotal: number; orderCreatedAt: string } {
  return operation.state === "SUCCEEDED" && operation.orderState === "PAGADO" &&
    typeof operation.orderId === "string" && operation.orderId.length > 0 &&
    typeof operation.orderTotal === "number" && Number.isFinite(operation.orderTotal) &&
    typeof operation.orderCreatedAt === "string" && Number.isFinite(Date.parse(operation.orderCreatedAt));
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

async function requestCurrentCart(): Promise<CheckoutCartSnapshot> {
  const response = await fetch("/api/cart/current", { cache: "no-store" });
  let payload: unknown;
  try { payload = await response.json(); } catch {
    throw new CheckoutApiError(response.status, "INVALID_BACKEND_RESPONSE");
  }
  if (!response.ok) {
    const code = isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === "string"
      ? payload.error.code
      : "CART_BACKEND_UNAVAILABLE";
    throw new CheckoutApiError(response.status, code);
  }
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  const data = payload.data;
  if ((data.cartId !== null && typeof data.cartId !== "string") ||
      typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 0 ||
      !Array.isArray(data.items) ||
      !data.items.every((item) => isRecord(item) && typeof item.sku === "string" && item.sku.length > 0 &&
        typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0)) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  return {
    cartId: data.cartId as string | null,
    version: data.version,
    items: data.items.map((item) => ({ sku: item.sku as string, quantity: item.quantity as number })),
  };
}

type BackendQuote = {
  quoteId: string;
  expiresAt: string;
  subtotal: { amount: number };
  discount: { amount: number };
  shipping: { amount: number; estimatedDays: number };
  total: { amount: number };
  addressId: string;
  cartVersion: number;
  lines: Array<{ sku: string; quantity: number }>;
  selectedBenefit?: { type: string; id: string; discount: { amount: number } };
};

function parseExpiry(value: unknown) {
  if (typeof value !== "string") throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  const expiry = Date.parse(value);
  if (!Number.isFinite(expiry)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  return expiry;
}

function normalizeQuote(payload: unknown): CheckoutQuote {
  if (!isRecord(payload)) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  const quote = payload as unknown as BackendQuote;
  const validMoney = (money: unknown): money is { amount: number } => isRecord(money) && typeof money.amount === "number" && Number.isFinite(money.amount);
  const validLines = Array.isArray(quote.lines) && quote.lines.every((line) => isRecord(line) && typeof line.sku === "string" && typeof line.quantity === "number" && Number.isInteger(line.quantity) && line.quantity > 0);
  if (typeof quote.quoteId !== "string" || typeof quote.expiresAt !== "string" ||
      !validMoney(quote.subtotal) || !validMoney(quote.discount) || !validMoney(quote.shipping) ||
      typeof quote.shipping.estimatedDays !== "number" || !Number.isFinite(quote.shipping.estimatedDays) ||
      !validMoney(quote.total) || typeof quote.addressId !== "string" || !validLines ||
      typeof quote.cartVersion !== "number" || !Number.isInteger(quote.cartVersion) ||
      (quote.selectedBenefit !== undefined && (!isRecord(quote.selectedBenefit) || typeof quote.selectedBenefit.type !== "string" || typeof quote.selectedBenefit.id !== "string" || !validMoney(quote.selectedBenefit.discount)))) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  const expiresAt = parseExpiry(quote.expiresAt);
  if (!quote.quoteId) throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  return {
    quoteId: quote.quoteId,
    expiresAt,
    subtotal: quote.subtotal.amount,
    discount: quote.discount.amount,
    shipping: quote.shipping.amount,
    estimatedDays: quote.shipping.estimatedDays,
    total: quote.total.amount,
    addressId: quote.addressId,
    cartVersion: quote.cartVersion,
    lines: quote.lines,
    ...(quote.selectedBenefit ? { selectedBenefit: { type: quote.selectedBenefit.type, id: quote.selectedBenefit.id, discount: quote.selectedBenefit.discount.amount } } : {}),
  };
}

function normalizeBenefit(payload: unknown, currentQuote: CheckoutQuote): CheckoutQuote {
  if (!isRecord(payload) || typeof payload.quoteId !== "string" || !payload.quoteId ||
      !isRecord(payload.total) || typeof payload.total.amount !== "number" || !Number.isFinite(payload.total.amount) ||
      !isRecord(payload.selectedBenefit) || typeof payload.selectedBenefit.type !== "string" ||
      typeof payload.selectedBenefit.id !== "string" || !isRecord(payload.selectedBenefit.discount) ||
      typeof payload.selectedBenefit.discount.amount !== "number" || !Number.isFinite(payload.selectedBenefit.discount.amount)) {
    throw new CheckoutApiError(502, "INVALID_BACKEND_RESPONSE");
  }
  const expiresAt = parseExpiry(payload.expiresAt);

  // F-024 returns a partial quote. Preserve the already-authoritative base quote
  // fields, while replacing all benefit-owned fields from this response.
  const selectedBenefit = {
    type: payload.selectedBenefit.type as string,
    id: payload.selectedBenefit.id as string,
    discount: (payload.selectedBenefit.discount as { amount: number }).amount,
  };
  return {
    ...currentQuote,
    quoteId: payload.quoteId,
    expiresAt,
    total: payload.total.amount,
    discount: selectedBenefit?.discount ?? 0,
    selectedBenefit,
  };
}

export const checkoutApi = {
  getCurrentCart: requestCurrentCart,
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
  async applyBenefit(currentQuote: CheckoutQuote, couponCode: string) {
    const payload = await request("benefits", "POST", { quoteId: currentQuote.quoteId, couponCode });
    return normalizeBenefit(payload, currentQuote);
  },
  async removeBenefit(currentQuote: CheckoutQuote) {
    return normalizeQuote(await request("quotes", "POST", {
      addressId: currentQuote.addressId,
      cartVersion: currentQuote.cartVersion,
    }));
  },
  async prepare(quoteId: string, cartVersion: number, idempotencyKey: string) {
    return parseOperation(await request("preparations", "POST", { quoteId, cartVersion, simulationConfirmed: true }, idempotencyKey));
  },
  async createOrder(operationId: string, contact: Contact, idempotencyKey: string) {
    return parseOperation(await request("orders", "POST", { checkoutOperationId: operationId, contact }, idempotencyKey));
  },
  async getOperation(operationId: string) {
    return parseOperation(await request(`operations/${encodeURIComponent(operationId)}`, "GET"), operationId);
  },
};

export const backendMockEnabled = process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock";

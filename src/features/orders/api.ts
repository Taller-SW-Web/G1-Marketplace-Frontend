import type {
  OrdersHistoryResponse,
  OrderDetail,
  OrderTracking,
  OrdersSource,
  OrderSummary,
} from "./types";
import type { OrderFilters } from "./filters";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOrder(value: unknown): value is OrderSummary {
  if (!isRecord(value) || !isRecord(value.total)) return false;
  return (
    typeof value.orderId === "string" &&
    value.orderId.trim().length > 0 &&
    typeof value.state === "string" &&
    value.state.trim().length > 0 &&
    typeof value.total.amount === "number" &&
    Number.isFinite(value.total.amount) &&
    typeof value.total.currency === "string" &&
    /^[A-Z]{3}$/.test(value.total.currency) &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt))
  );
}

export function isOrdersHistory(value: unknown): value is OrdersHistoryResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.page))
    return false;
  const page = value.page;
  return (
    value.data.every(isOrder) &&
    ["number", "size", "totalElements", "totalPages"].every(
      (key) => Number.isSafeInteger(page[key]) && Number(page[key]) >= 0,
    ) &&
    Number(page.size) >= 1 &&
    value.data.length <= Number(page.size)
  );
}

function isMilestone(value: unknown): value is { state: string; at: string } {
  return isRecord(value) && typeof value.state === "string" && value.state.length > 0
    && typeof value.at === "string" && !Number.isNaN(Date.parse(value.at));
}
function isHistoricalLine(value: unknown): value is OrderDetail["lines"][number] {
  return isRecord(value) && typeof value.sku === "string" && value.sku.length > 0
    && typeof value.description === "string" && Number.isSafeInteger(value.quantity) && Number(value.quantity) > 0
    && isRecord(value.unitPrice) && typeof value.unitPrice.amount === "number"
    && Number.isFinite(value.unitPrice.amount) && typeof value.unitPrice.currency === "string"
    && /^[A-Z]{3}$/.test(value.unitPrice.currency);
}

export class OrdersRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readOrderDetail(orderId: string, signal: AbortSignal): Promise<OrderDetail> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { signal, cache: "no-store" });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : payload;
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "ORDER_UNAVAILABLE";
    throw new OrdersRequestError(code, code === "ORDER_NOT_AVAILABLE"
      ? "No encontramos un pedido disponible para tu cuenta."
      : response.status === 401 ? "Inicia sesión para consultar el detalle de tus pedidos."
      : "No pudimos cargar el detalle. Inténtalo nuevamente.");
  }
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  const lines = data?.lines;
  const milestones = data?.milestones;
  if (!data || !isOrder(data) || !Array.isArray(lines) || !lines.every(isHistoricalLine)
    || !Array.isArray(milestones) || !milestones.every(isMilestone)) {
    throw new OrdersRequestError("INVALID_RESPONSE", "Recibimos un detalle que no pudimos interpretar.");
  }
  return data as unknown as OrderDetail;
}

export async function readOrderTracking(orderId: string, signal: AbortSignal): Promise<OrderTracking | null> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/tracking`, { signal, cache: "no-store" });
  const payload: unknown = await response.json();
  if (response.status === 202) return null;
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : payload;
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "TRACKING_UNAVAILABLE";
    throw new OrdersRequestError(code, code === "ORDER_NOT_AVAILABLE" ? "No encontramos un pedido disponible para tu cuenta." : "No pudimos cargar el seguimiento. Inténtalo nuevamente.");
  }
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  if (!data || typeof data.state !== "string" || !Array.isArray(data.milestones) || !data.milestones.every(isMilestone)
    || (data.estimatedDelivery !== undefined && (typeof data.estimatedDelivery !== "string" || Number.isNaN(Date.parse(data.estimatedDelivery))))) {
    throw new OrdersRequestError("INVALID_RESPONSE", "Recibimos un seguimiento que no pudimos interpretar.");
  }
  return data as unknown as OrderTracking;
}

export type ReorderResponse = {
  cartId: string;
  version: number;
  added: Array<{ sku: string; quantity: number }>;
  adjustments: Array<{ sku: string; reason: string }>;
};

function isReorderResponse(value: unknown): value is ReorderResponse {
  return isRecord(value) && typeof value.cartId === "string" && value.cartId.length > 0
    && Number.isSafeInteger(value.version) && Number(value.version) >= 0
    && Array.isArray(value.added) && value.added.every((line) => isRecord(line)
      && typeof line.sku === "string" && Number.isSafeInteger(line.quantity) && Number(line.quantity) > 0)
    && Array.isArray(value.adjustments) && value.adjustments.every((line) => isRecord(line)
      && typeof line.sku === "string" && typeof line.reason === "string");
}

export async function reorderOrder(orderId: string, idempotencyKey: string, signal?: AbortSignal): Promise<ReorderResponse> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/reorder`, {
    method: "POST", cache: "no-store", signal,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : payload;
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "REORDER_UNAVAILABLE";
    const message = code === "UNAUTHENTICATED" ? "Inicia sesión para volver a agregar estos productos."
      : code === "ORDER_NOT_AVAILABLE" ? "No encontramos un pedido disponible para tu cuenta."
      : code === "CART_CONFLICT" ? "El carrito cambió. Actualízalo e inténtalo nuevamente."
      : code === "REORDER_UNAVAILABLE" || code === "COMMERCE_DATA_UNAVAILABLE"
        ? "La recompra no está disponible en este entorno todavía."
        : "No pudimos volver a agregar los productos. Inténtalo nuevamente.";
    throw new OrdersRequestError(code, message);
  }
  const data = isRecord(payload) ? payload.data : null;
  if (!isReorderResponse(data)) throw new OrdersRequestError("INVALID_RESPONSE", "Recibimos un resultado de recompra que no pudimos interpretar.");
  return data;
}

export async function readOrders(
  page: number,
  signal: AbortSignal,
  filters: OrderFilters = {},
): Promise<{ data: OrdersHistoryResponse; source: OrdersSource }> {
  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (filters.state) params.set("state", filters.state);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const response = await fetch(`/api/orders/me?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const code =
      isRecord(payload) && typeof payload.code === "string"
        ? payload.code
        : response.status === 401
          ? "UNAUTHENTICATED"
          : "ORDERS_UNAVAILABLE";
    const message = code === "RANGO_FECHAS_INVALIDO"
      ? "Revisa el rango: las fechas deben estar en orden y no superar un año."
      : code === "FORMATO_INVALIDO"
        ? "Revisa el formato de los filtros e inténtalo nuevamente."
        : response.status === 401
          ? "Tu sesión venció. Inicia sesión para volver a consultar tus pedidos."
          : "No pudimos cargar tus pedidos. Inténtalo nuevamente.";
    throw new OrdersRequestError(code, message);
  }
  if (!isOrdersHistory(payload)) {
    throw new OrdersRequestError(
      "INVALID_RESPONSE",
      "Recibimos una respuesta que no pudimos interpretar. Inténtalo nuevamente.",
    );
  }
  const responseSource = response.headers.get("x-orders-source");
  const source: OrdersSource =
    responseSource === "MOCK" || responseSource === "REAL"
      ? responseSource
      : "UNCONFIGURED";
  return { data: payload, source };
}

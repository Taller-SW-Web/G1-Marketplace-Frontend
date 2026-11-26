import type {
  OrdersHistoryResponse,
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
export class OrdersRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readOrderDetail(orderId: string, signal: AbortSignal): Promise<OrderSummary> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { signal, cache: "no-store" });
  if (response.status === 403 || response.status === 404) {
    throw new OrdersRequestError("ORDER_NOT_AVAILABLE", "No encontramos un pedido disponible para tu cuenta.");
  }
  if (!response.ok) {
    const message = response.status === 401 ? "Inicia sesión para consultar el detalle de tus pedidos."
      : "No pudimos cargar el detalle. Inténtalo nuevamente.";
    throw new OrdersRequestError(response.status === 401 ? "UNAUTHENTICATED" : "ORDER_UNAVAILABLE", message);
  }
  const payload: unknown = await response.json();
  if (!isOrder(payload) || payload.orderId !== orderId) {
    throw new OrdersRequestError("INVALID_RESPONSE", "Recibimos un detalle que no pudimos interpretar.");
  }
  const { state, total, createdAt } = payload;
  return { orderId, state, total, createdAt };
}

export async function readOrderTracking(orderId: string, signal: AbortSignal): Promise<OrderTracking | null> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/tracking`, { signal, cache: "no-store" });
  if (response.status === 202) return null;
  if (response.status === 403 || response.status === 404) {
    throw new OrdersRequestError("ORDER_NOT_AVAILABLE", "No encontramos un pedido disponible para tu cuenta.");
  }
  const payload: unknown = await response.json();
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

import type {
  OrdersHistoryResponse,
  OrdersSource,
  OrderSummary,
} from "./types";

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

export class OrdersRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readOrders(
  page: number,
  signal: AbortSignal,
): Promise<{ data: OrdersHistoryResponse; source: OrdersSource }> {
  const response = await fetch(`/api/orders/me?page=${page}&pageSize=10`, {
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
    const message =
      response.status === 401
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

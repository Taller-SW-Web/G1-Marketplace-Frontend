export type OrderSummary = {
  orderId: string;
  state: string;
  total: { amount: number; currency: string };
  createdAt: string;
};

export type OrdersPageData = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type OrdersHistoryResponse = {
  data: OrderSummary[];
  page: OrdersPageData;
};

export type OrdersSource = "MOCK" | "REAL" | "UNCONFIGURED";

export type OrdersHistoryState =
  | { status: "loading" }
  | { status: "ready"; data: OrdersHistoryResponse; source: OrdersSource }
  | { status: "error"; message: string; code: string };

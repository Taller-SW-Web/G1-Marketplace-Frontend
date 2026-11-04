export type OrderSummary = {
  orderId: string;
  state: string;
  total: { amount: number; currency: string };
  createdAt: string;
};

export type OrderDetail = OrderSummary & {
  lines: Array<{ sku: string; description: string; quantity: number; unitPrice: { amount: number; currency: string } }>;
  milestones: Array<{ state: string; at: string }>;
  shipping?: {
    estimatedDelivery?: string;
    locationSummary?: string;
    emailMasked?: string;
    phoneMasked?: string;
  };
};

export type OrderTracking = {
  state: string;
  estimatedDelivery?: string;
  milestones: Array<{ state: string; at: string }>;
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

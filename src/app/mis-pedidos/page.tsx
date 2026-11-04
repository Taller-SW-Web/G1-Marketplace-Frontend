import type { Metadata } from "next";
import { OrdersHistoryContainer } from "@/features/orders/OrdersHistory";
import type { OrderFilters } from "@/features/orders/filters";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description: "Consulta el historial de tus pedidos.",
};

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const parsedPage = params.page && /^\d+$/.test(params.page) ? Number(params.page) : 0;
  const initialPage = Number.isSafeInteger(parsedPage) ? parsedPage : 0;
  const initialFilters: OrderFilters = {
    ...(params.state ? { state: params.state as NonNullable<OrderFilters["state"]> } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  };

  return <OrdersHistoryContainer initialPage={initialPage} initialFilters={initialFilters} />;
}

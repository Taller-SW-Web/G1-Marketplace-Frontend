import type { Metadata } from "next";
import { OrdersHistory } from "@/features/orders/OrdersHistory";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description: "Consulta el historial de tus pedidos.",
};

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const parsedPage = params.page && /^\d+$/.test(params.page) ? Number(params.page) : 0;
  const initialPage = Number.isSafeInteger(parsedPage) ? parsedPage : 0;

  return <OrdersHistory initialPage={initialPage} />;
}

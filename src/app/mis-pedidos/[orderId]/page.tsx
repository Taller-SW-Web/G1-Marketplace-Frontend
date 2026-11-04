import type { Metadata } from "next";
import { OrderDetailContainer } from "@/features/orders/OrderDetailContainer";

export const metadata: Metadata = { title: "Detalle del pedido", description: "Consulta el detalle de tu pedido." };

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderDetailContainer orderId={orderId} reorderEnabled={process.env.REORDER_UI_ENABLED === "true"} />;
}

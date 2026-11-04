import type { Metadata } from "next";
import { ShipmentTrackingContainer } from "@/features/orders/ShipmentTrackingContainer";

export const metadata: Metadata = { title: "Seguimiento del pedido", description: "Consulta los hitos públicos de despacho de tu pedido." };

export default async function OrderTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <ShipmentTrackingContainer orderId={orderId} />;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { OrdersRequestError, readOrderTracking } from "./api";
import { ShipmentTimeline } from "./ShipmentTimeline";
import type { OrderTracking } from "./types";

export function ShipmentTrackingContainer({ orderId }: { orderId: string }) {
  const [data, setData] = useState<OrderTracking | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(undefined); setError(null);
    readOrderTracking(orderId, controller.signal).then(setData).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof OrdersRequestError ? reason.message : "No pudimos cargar el seguimiento.");
    });
    return () => controller.abort();
  }, [orderId, retry]);
  return <main className="order-detail-page">
    <nav className="orders-breadcrumb" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><span aria-hidden="true">›</span><Link href="/mis-pedidos">Mis pedidos</Link><span aria-hidden="true">›</span><Link href={`/mis-pedidos/${encodeURIComponent(orderId)}`}>Detalle</Link><span aria-hidden="true">›</span><span aria-current="page">Seguimiento</span></nav>
    <header className="orders-heading"><h1>Seguimiento del pedido</h1><p>{orderId}</p></header>
    {data === undefined && !error && <p role="status" aria-live="polite">Consultando seguimiento…</p>}
    {error && <EmptyState className="orders-error" title="No pudimos consultar el seguimiento" description={error} actions={<Button variant="primary" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>} />}
    {data === null && <EmptyState title="El pedido aún no está en despacho" description="Cuando el pedido tenga información de seguimiento, aparecerá aquí." />}
    {data && <ShipmentTimeline state={data.state} milestones={data.milestones} estimatedDelivery={data.estimatedDelivery} />}
  </main>;
}

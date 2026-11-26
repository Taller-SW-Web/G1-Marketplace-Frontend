"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { OrdersRequestError, readOrderTracking } from "./api";
import { ShipmentTimeline } from "./ShipmentTimeline";
import type { OrderTracking } from "./types";

export function ShipmentTrackingContainer({ orderId }: { orderId: string }) {
  type Result = { key: string } & ({ data: OrderTracking | null } | { error: string; denied: boolean });
  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${orderId}:${retry}`;
  const current = result?.key === key ? result : null;
  const data = current && "data" in current ? current.data : undefined;
  const error = current && "error" in current ? current.error : null;
  const denied = current && "denied" in current && current.denied;
  useEffect(() => {
    const controller = new AbortController();
    readOrderTracking(orderId, controller.signal).then((loadedTracking) => {
      if (!controller.signal.aborted) setResult({ key, data: loadedTracking });
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      const message = reason instanceof OrdersRequestError ? reason.message : "No pudimos cargar el seguimiento.";
      const denied = reason instanceof OrdersRequestError && reason.code === "ORDER_NOT_AVAILABLE";
      setResult({ key, error: message, denied });
    });
    return () => controller.abort();
  }, [orderId, key]);
  return <main className="order-detail-page">
    <nav className="orders-breadcrumb" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><span aria-hidden="true">›</span><Link href="/mis-pedidos">Mis pedidos</Link><span aria-hidden="true">›</span>{!error && data !== undefined && <><Link href={`/mis-pedidos/${encodeURIComponent(orderId)}`}>Detalle</Link><span aria-hidden="true">›</span></>}<span aria-current="page">Seguimiento</span></nav>
    <header className="orders-heading"><h1>Seguimiento del pedido</h1>{!error && data !== undefined && <p>{orderId}</p>}</header>
    {data === undefined && !error && <p role="status" aria-live="polite">Consultando seguimiento…</p>}
    {error && <EmptyState className="orders-error" title={denied ? "Pedido no disponible" : "No pudimos consultar el seguimiento"} description={error} actions={denied ? undefined : <Button variant="primary" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>} />}
    {data === null && <EmptyState title="El pedido aún no está en despacho" description="Puedes volver a consultar cuando cambie el estado." actions={<Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>Actualizar seguimiento</Button>} />}
    {data && <ShipmentTimeline state={data.state} milestones={data.milestones} estimatedDelivery={data.estimatedDelivery} />}
  </main>;
}

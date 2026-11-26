"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { OrdersRequestError, readOrderDetail } from "./api";
import type { OrderDetail } from "./types";
import { HistoricalOrderLines } from "./HistoricalOrderLines";
import { OrderStateTimeline } from "./OrderStateTimeline";
import { OrderDeliverySummary } from "./OrderDeliverySummary";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);
}

export function OrderDetailContainer({ orderId }: { orderId: string }) {
  type Result = { key: string } & ({ detail: OrderDetail } | { error: { code: string; message: string } });
  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${orderId}:${retry}`;
  const current = result?.key === key ? result : null;
  const detail = current && "detail" in current ? current.detail : null;
  const error = current && "error" in current ? current.error : null;
  useEffect(() => {
    const controller = new AbortController();
    readOrderDetail(orderId, controller.signal).then((loadedDetail) => {
      if (!controller.signal.aborted) setResult({ key, detail: loadedDetail });
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      const requestError = reason instanceof OrdersRequestError
        ? { code: reason.code, message: reason.message }
        : { code: "ORDER_UNAVAILABLE", message: "No pudimos cargar el detalle. Inténtalo nuevamente." };
      setResult({ key, error: requestError });
    });
    return () => controller.abort();
  }, [orderId, key]);

  return <main className="order-detail-page">
    <nav className="orders-breadcrumb" aria-label="Ruta de navegación">
      <Link href="/">Inicio</Link><span aria-hidden="true">›</span><Link href="/mis-pedidos">Mis pedidos</Link><span aria-hidden="true">›</span><span aria-current="page">Detalle</span>
    </nav>
    <header className="orders-heading"><h1>Detalle del pedido</h1><p>{orderId}</p></header>
    {!detail && !error && <p role="status" aria-live="polite">Cargando detalle del pedido…</p>}
    {error && <EmptyState className="orders-error" title={error.code === "ORDER_NOT_AVAILABLE" ? "Pedido no disponible" : "No pudimos cargar el pedido"} description={error.message} actions={<Button variant="primary" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>} />}
    {detail && <>
      <section className="order-detail-section" aria-labelledby="order-summary-title">
        <h2 id="order-summary-title">Resumen</h2>
        <dl className="order-detail-summary"><div><dt>Estado</dt><dd>{detail.state.replaceAll("_", " ")}</dd></div><div><dt>Fecha</dt><dd>{new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(new Date(detail.createdAt))}</dd></div><div><dt>Total histórico</dt><dd>{money(detail.total.amount, detail.total.currency)}</dd></div></dl>
      </section>
      <HistoricalOrderLines lines={detail.lines} />
      {detail.shipping && <OrderDeliverySummary shipping={detail.shipping} />}
      <OrderStateTimeline milestones={detail.milestones} />
      {detail.state !== "ANULADO" && <p><Link className="button button--secondary button--md" href={`/mis-pedidos/${encodeURIComponent(orderId)}/seguimiento`}>Ver seguimiento</Link></p>}
    </>}
  </main>;
}
